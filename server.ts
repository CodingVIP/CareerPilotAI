import express from 'express';
import http from 'http';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns/promises';
import net from 'node:net';
import { AIProvider, createAIProvider } from './aiProvider';
import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { createServer as createViteServer } from 'vite';
import { verifyToken } from '@clerk/backend';
import {
  applySyncOperation,
  createAiJob,
  ensureUser,
  getAiJob,
  getOwnedResumeVersion,
  getUserSnapshot,
  SyncOperationInput,
  updateResumeFile,
} from './src/server/db/repository';
import { decodeResumeData, deletePrivateResume, readPrivateResume, uploadPrivateResume } from './src/server/blob';
import { isDistributedRateLimitingConfigured, rateLimit } from './src/server/rateLimit';
import { AiJobKind, inngest, inngestFunctions, isInngestConfigured } from './src/server/inngest';
import { serve as serveInngest } from 'inngest/express';
import { validateAtsResult, validateInterviewResult, validateScrapeResult } from './src/server/aiValidation';
import { requestObservability } from './src/server/observability';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(requestObservability);
app.use(express.json({ limit: '10mb' }));
app.use('/api/inngest', serveInngest({ client: inngest, functions: inngestFunctions }));

const MAX_FETCH_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function requireApiAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.NODE_ENV !== 'production' && !API_AUTH_TOKEN && !process.env.CLERK_SECRET_KEY) {
    return next();
  }
  const supplied = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!supplied) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const claims = await verifyToken(supplied, {
        secretKey: process.env.CLERK_SECRET_KEY,
        authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES?.split(',').map((item) => item.trim()),
      });
      res.locals.userId = claims.sub;
      return next();
    } catch (error) {
      console.warn('Clerk token verification failed:', error);
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
  }
  if (supplied !== API_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
  res.locals.userId = 'shared-token-user';
  return next();
}

function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0
    );
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) {
      return isPrivateAddress(normalized.slice(7));
    }
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('::ffff:') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }
  return true;
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Please provide a valid job posting URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only public HTTP(S) job posting URLs are supported.');
  }
  const addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('The requested URL resolves to a private or unavailable network address.');
  }
  return parsed;
}

async function fetchPublicUrl(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let current = await assertPublicHttpUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await fetch(current, { ...init, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_FETCH_BYTES) {
        throw new Error('The remote response is too large to process.');
      }
      return response;
    }
    const location = response.headers.get('location');
    if (!location || redirect === MAX_REDIRECTS) {
      throw new Error('The remote URL redirected too many times.');
    }

    current = await assertPublicHttpUrl(new URL(location, current).toString());
  }
  throw new Error('The remote URL redirected too many times.');
}

async function readResponseText(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FETCH_BYTES) {
        await reader.cancel();
        throw new Error('The remote response is too large to process.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Shared Gemini Client with required header
const ai: AIProvider = createAIProvider();
const SchemaType = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  ARRAY: 'ARRAY',
} as const;
const DEFAULT_MODEL =
  process.env.AI_MODEL ||
  (process.env.AI_PROVIDER === 'gemini' || !process.env.AI_PROVIDER ? 'gemini-3.8-flash' : 'local-model');

// Resilient API Call Helper with Exponential Backoff
async function callAIWithRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTransient =
        errorMessage.includes('503') ||
        errorMessage.includes('429') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < retries) {
        console.warn(
          `AI provider transient spike (attempt ${attempt}/${retries}): ${errorMessage}. Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sanitizes and formats job descriptions into clean rich-text HTML
// Preserves nested <ul>, <ol>, <li>, indentation styles, headings, and bold text
function sanitizeRichTextHtml(input: string): string {
  if (!input || !input.trim()) return '';
  const trimmed = input.trim();
  const isHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  // Helper to format inline markdown bold and links
  const formatInlineText = (text: string): string => {
    let formatted = escapeHtml(text);
    // Convert markdown bold **text** to <strong>text</strong>
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Clean markdown link formatting [text](url) -> text
    formatted = formatted.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return formatted;
  };

  if (!isHtml) {
    const lines = trimmed.split(/\r?\n/);
    let html = '';
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTrim = line.trim();

      if (!lineTrim) {
        if (inUl) { html += '</ul>\n'; inUl = false; }
        if (inOl) { html += '</ol>\n'; inOl = false; }
        continue;
      }

      // Detect indentation (tabs or 2+ spaces)
      const leadingSpaces = line.match(/^[\t ]*/)?.[0] || '';
      const isIndented = leadingSpaces.replace(/\t/g, '  ').length >= 2;

      // Detect markdown headings: #, ##, ###, or **Heading** on its own line
      const mdHeadingMatch = lineTrim.match(/^#{1,4}\s+(.*)$/);
      const boldHeadingMatch = lineTrim.match(/^\*\*([A-Za-z0-9\s,\/&\-\(\)]+)\*\*[:]?$/);

      if (mdHeadingMatch || boldHeadingMatch) {
        if (inUl) { html += '</ul>\n'; inUl = false; }
        if (inOl) { html += '</ol>\n'; inOl = false; }
        const headingText = (mdHeadingMatch ? mdHeadingMatch[1] : boldHeadingMatch![1]).trim();
        html += `<h4 class="job-rich-h4 font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">${escapeHtml(headingText)}</h4>\n`;
        continue;
      }

      // Detect bullet or numbered items: •, -, *, 1., 1)
      const bulletMatch = lineTrim.match(/^([•\-\*▪▫■⁃·]|(?:\d+[\.\)]))\s+(.*)$/);
      if (bulletMatch) {
        const marker = bulletMatch[1];
        const text = bulletMatch[2];
        const isNumbered = /^\d+[\.\)]$/.test(marker);

        if (isNumbered) {
          if (inUl) { html += '</ul>\n'; inUl = false; }
          if (!inOl) { html += '<ol class="job-rich-ol">\n'; inOl = true; }
        } else {
          if (inOl) { html += '</ol>\n'; inOl = false; }
          if (!inUl) { html += '<ul class="job-rich-ul">\n'; inUl = true; }
        }

        const indentAttr = isIndented ? ' style="margin-left: 1.5rem;"' : '';
        html += `  <li${indentAttr}>${formatInlineText(text)}</li>\n`;
      } else {
        if (inUl) { html += '</ul>\n'; inUl = false; }
        if (inOl) { html += '</ol>\n'; inOl = false; }

        if (
          lineTrim.length < 85 &&
          (lineTrim.endsWith(':') ||
            /^(overview|about us|about the team|the role|responsibilities|qualifications|requirements|preferred|benefits|what we offer|compensation|who you are|key duties)/i.test(lineTrim))
        ) {
          html += `<h4 class="job-rich-h4 font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">${formatInlineText(lineTrim)}</h4>\n`;
        } else {
          html += `<p class="job-rich-p mb-2">${formatInlineText(lineTrim)}</p>\n`;
        }
      }
    }

    if (inUl) html += '</ul>\n';
    if (inOl) html += '</ol>\n';
    return html;
  }

  // Load existing HTML into Cheerio
  const $ = cheerio.load(trimmed);
  $('script, style, noscript, svg, iframe, form, button, nav, footer, header, input').remove();

  $('*').each((_, el) => {
    const attribs = (el as any).attribs || {};
    for (const attr of Object.keys(attribs)) {
      if (attr !== 'style' && attr !== 'class') {
        $(el).removeAttr(attr);
      }
    }
  });

  $('ul').addClass('job-rich-ul');
  $('ol').addClass('job-rich-ol');
  $('p').addClass('job-rich-p');
  $('h1, h2, h3, h4, h5, h6').addClass('job-rich-h4');

  return $('body').html() || trimmed;
}

// Clean boilerplate or large embedded state objects from universal headless reader markdown
function cleanHeadlessContent(rawText: string): string {
  if (!rawText) return '';
  // Strip large JSON objects embedded in state
  let cleaned = rawText
    .replace(/`\{[\s\S]*?themeOptions[\s\S]*?\}`/g, '')
    .replace(/`\{[\s\S]*?navbarData[\s\S]*?\}`/g, '')
    .replace(/`\{[\s\S]*?positionFq[\s\S]*?\}`/g, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Drop noisy single-line JSON or state configuration payloads
      if ((trimmed.startsWith('{"') || trimmed.startsWith('`{"') || trimmed.startsWith('varTheme')) && trimmed.length > 250) {
        return false;
      }
      return true;
    })
    .join('\n');

  return cleaned.trim();
}

// Tier 2 Universal Headless Reader: renders modern client-side SPAs (Microsoft, Workday, Greenhouse, etc.)
async function fetchUniversalHeadless(targetUrl: string): Promise<string | null> {
  try {
    await assertPublicHttpUrl(targetUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    const readerUrl = `https://r.jina.ai/${targetUrl}`;

    try {
      const response = await fetchPublicUrl(readerUrl, {
        signal: controller.signal,
        headers: {
        Accept: 'text/plain, text/markdown',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        console.warn(`Universal Headless Reader returned status ${response.status} for ${targetUrl}`);
        return null;
      }

      const text = await readResponseText(response);
      if (!text || text.trim().length < 150) {
        return null;
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.warn(`Universal Headless Reader request failed for ${targetUrl}:`, err);
    return null;
  }
}

interface ParsedHtmlJob {
  company: string;
  role: string;
  location: string;
  jobType: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  requirements: string[];
  description: string;
  rawDescription?: string;
  hasJobPostingSchema: boolean;
}

// Comprehensive HTML Job Extractor supporting Schema.org JobPosting, OpenGraph, and Semantic DOM
function parseHtmlJobData(html: string, url: string, fallbackRawText?: string): ParsedHtmlJob {
  let company = '';
  let role = '';
  let location = '';
  let jobType: 'remote' | 'hybrid' | 'onsite' = 'remote';
  let salaryMin: number | undefined = undefined;
  let salaryMax: number | undefined = undefined;
  const salaryCurrency = 'USD';
  const requirements: string[] = [];
  let description = '';
  let hasJobPostingSchema = false;

  if (html && html.trim().length > 0) {
    const $ = cheerio.load(html);

    // 1. Check for Schema.org JobPosting in <script type="application/ld+json">
    let jobPosting: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed['@type'] === 'JobPosting') {
            jobPosting = parsed;
          } else if (Array.isArray(parsed['@graph'])) {
            const found = parsed['@graph'].find((item: any) => item['@type'] === 'JobPosting');
            if (found) jobPosting = found;
          }
        }
      } catch {
        // Continue searching other script tags
      }
    });

    if (jobPosting) {
      hasJobPostingSchema = true;
      role = (jobPosting.title || '').trim();
      company = (jobPosting.hiringOrganization?.name || '').trim();

      // Location from PostalAddress
      const addr = jobPosting.jobLocation?.address;
      if (addr) {
        let locality = addr.addressLocality || '';
        let region = (addr.addressRegion || '').replace(/,[A-Z]{2}$/i, '').trim();
        let country = typeof addr.addressCountry === 'string' ? addr.addressCountry : addr.addressCountry?.name || '';
        if (country === 'CA') country = 'Canada';
        else if (country === 'US') country = 'United States';
        const locParts = [locality, region, country].filter(Boolean);
        if (locParts.length > 0) {
          location = locParts.join(', ');
        }
      }

      description = (jobPosting.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      // Check employmentType or description for remote/hybrid
      const fullText = (jobPosting.description || '') + ' ' + (jobPosting.employmentType || '');
      if (/hybrid/i.test(fullText)) jobType = 'hybrid';
      else if (/on-site|onsite|in-office/i.test(fullText)) jobType = 'onsite';
      else if (/remote/i.test(fullText)) jobType = 'remote';

      // Base salary if provided in schema
      if (jobPosting.baseSalary?.value) {
        const val = jobPosting.baseSalary.value;
        if (typeof val.minValue === 'number') salaryMin = val.minValue;
        if (typeof val.maxValue === 'number') salaryMax = val.maxValue;
        if (typeof val.value === 'number') {
          salaryMin = val.value;
          salaryMax = val.value;
        }
      }
    }

    // 2. OpenGraph & Meta Tags
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const pageTitle = $('title').text().trim() || ogTitle || '';

    if (!company) {
      if (ogSiteName) {
        company = ogSiteName.trim();
      } else if (url) {
        try {
          const parsedUrl = new URL(url);
          const hostParts = parsedUrl.hostname.replace('www.', '').split('.');
          if (hostParts.length > 0) {
            const first = hostParts[0].toLowerCase();
            if (['jobs', 'careers', 'boards', 'apply'].includes(first) && hostParts.length > 1) {
              company = hostParts[1];
            } else {
              company = first;
            }
            company = company.charAt(0).toUpperCase() + company.slice(1);
          }
        } catch {
          // Keep default
        }
      }
    }

    if (!role) {
      if (ogTitle) {
        // Strip out branding e.g. "Senior Software Engineer | Microsoft Careers"
        role = ogTitle.split(/\s*[-–—|]\s*/)[0].trim();
      } else if (pageTitle) {
        role = pageTitle.split(/\s*[-–—|]\s*/)[0].trim();
      }
    }

    if (!description && ogDesc) {
      description = ogDesc.replace(/\s+/g, ' ').trim();
    }

    let rawDescription = '';
    if (jobPosting && jobPosting.description) {
      rawDescription = sanitizeRichTextHtml(jobPosting.description);
    } else if (html) {
      const cloned = cheerio.load(html);
      cloned('script, style, noscript, nav, footer, header, svg, iframe, form, button, input').remove();
      const mainHtml = cloned('main, article, [role="main"]').html() || cloned('body').html() || '';
      rawDescription = sanitizeRichTextHtml(mainHtml);
    }

    // Fallback body text if description is still empty
    if (!description) {
      const cloned = $('body').clone();
      cloned.find('script, style, noscript, nav, footer, header, svg, iframe').remove();
      const mainText = cloned.find('main, article, [role="main"]').text() || cloned.text();
      description = mainText.replace(/\s+/g, ' ').trim().slice(0, 4000);
      if (!rawDescription) {
        rawDescription = sanitizeRichTextHtml(mainText);
      }
    }

    // Parse Salary regex if not found in Schema
    if (!salaryMin && !salaryMax) {
      // 1. Annual standard: e.g. "$160,000 to $220,000", "$150k - $200k", "base salary: $170,000 - $210,000"
      const salMatch = (description + ' ' + rawDescription).match(
        /(?:base (?:salary|pay|compensation)|salary range|compensation|pay range)?[:\s]*\$(\d{2,3}(?:,\d{3})*|\d{2,3}k)\s*(?:–|-|to)\s*\$?(\d{2,3}(?:,\d{3})*|\d{2,3}k)/i
      );
      if (salMatch) {
        const cleanNum = (str: string) => {
          let s = str.toLowerCase().replace(/,/g, '');
          if (s.endsWith('k')) return parseInt(s.replace('k', ''), 10) * 1000;
          return parseInt(s, 10);
        };
        salaryMin = cleanNum(salMatch[1]);
        salaryMax = cleanNum(salMatch[2]);
      } else {
        // 2. Hourly check: e.g. "$65 - $95 /hr" or "$50 to $80 per hour" -> convert to annual (2080 hrs)
        const hourlyMatch = (description + ' ' + rawDescription).match(
          /\$(\d{2,3}(?:\.\d{2})?)\s*(?:–|-|to)\s*\$?(\d{2,3}(?:\.\d{2})?)\s*(?:\/hr|per hour|\/hour)/i
        );
        if (hourlyMatch) {
          const hMin = parseFloat(hourlyMatch[1]);
          const hMax = parseFloat(hourlyMatch[2]);
          salaryMin = Math.round(hMin * 2080);
          salaryMax = Math.round(hMax * 2080);
        }
      }
    }

    // Requirements parsing: Look for bullet items or sentence qualifications
    $('ul li').each((_i, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 25 && t.length < 240 && requirements.length < 6) {
        requirements.push(t);
      }
    });

    if (requirements.length === 0 && description) {
      const qualificationPatterns = [
        /(?:Bachelor|Master|Degree)[^.!?\n]+(?:Computer Science|related technical field|engineering)[^.!?\n]*/gi,
        /(?:\d+\+?\s+years)[^.!?\n]+(?:experience|engineering|development|coding)[^.!?\n]*/gi,
        /(?:Experience developing|Experience designing|Experience building|Proficiency in)[^.!?\n]*/gi,
        /(?:Experience with|Knowledge of|Familiarity with)[^.!?\n]+(?:technologies|software|systems|APIs|media|cloud)[^.!?\n]*/gi,
      ];

      for (const pattern of qualificationPatterns) {
        const matches = description.match(pattern);
        if (matches) {
          for (const m of matches) {
            const clean = m.trim();
            if (clean.length > 25 && clean.length < 200 && !requirements.includes(clean) && requirements.length < 6) {
              requirements.push(clean);
            }
          }
        }
      }
    }
  } else if (fallbackRawText) {
    const lines = fallbackRawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // 1. Title detection (e.g. "Title: Senior Software Engineer | Microsoft Careers")
    const titleLine = lines.find((l) => /^Title:\s+/i.test(l));
    if (titleLine) {
      const fullTitle = titleLine.replace(/^Title:\s+/i, '').trim();
      const parts = fullTitle.split(/\s*[-–—|]\s*/);
      role = parts[0]?.trim() || '';
      if (parts.length > 1 && !company) {
        company = parts[1].replace(/careers|jobs|recruiting/i, '').trim();
      }
    }

    // 2. Heading detection (e.g. "## Senior Software Engineer" or "**Role Name**")
    if (!role) {
      const headingRole = lines.find((l) => /^#{1,3}\s+[A-Za-z]/.test(l) && !/single position|all jobs|overview|responsibilities|qualifications/i.test(l));
      if (headingRole) {
        role = headingRole.replace(/^#{1,3}\s+/, '').trim();
      } else {
        const firstMeaningful = lines.find((l) => l.length > 5 && l.length < 80 && !l.startsWith('http') && !l.startsWith('{'));
        role = firstMeaningful || 'Open Position';
      }
    }

    // 3. Location detection (e.g. "Canada, British Columbia, Vancouver" or "Austin, TX")
    const locLine = lines.find(
      (l) =>
        /^[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+(,\s*[A-Z][a-zA-Z\s]+)?$/.test(l) &&
        l.length < 65 &&
        !l.includes('Position') &&
        !l.includes('Posting')
    );
    if (locLine) {
      location = locLine.trim();
    }

    // 4. Company from URL hostname if not found
    if (!company && url) {
      try {
        const parsedUrl = new URL(url);
        const hostParts = parsedUrl.hostname.replace('www.', '').split('.');
        if (hostParts.length > 0) {
          const first = hostParts[0].toLowerCase();
          if (['jobs', 'careers', 'boards', 'apply'].includes(first) && hostParts.length > 1) {
            company = hostParts[1];
          } else {
            company = first;
          }
          company = company.charAt(0).toUpperCase() + company.slice(1);
        }
      } catch {}
    }

    // 5. Detect job type (remote, hybrid, onsite)
    const lower = fallbackRawText.toLowerCase();
    if (lower.includes('hybrid') || lower.includes('in-office') || lower.includes('days in office') || lower.includes('days/week')) {
      jobType = 'hybrid';
    } else if (lower.includes('remote') || lower.includes('work from home')) {
      jobType = 'remote';
    } else if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-person')) {
      jobType = 'onsite';
    }

    description = fallbackRawText.slice(0, 3500);

    // 6. Extract bullet requirements
    lines.forEach((l) => {
      const m = l.match(/^([•\-\*▪▫■⁃·]|\d+[\.\)])\s+(.*)$/);
      if (m) {
        const t = m[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1');
        if (t.length > 25 && t.length < 240 && requirements.length < 8 && !requirements.includes(t)) {
          requirements.push(t);
        }
      }
    });
  }

  // Ensure role doesn't have suffix like "| Microsoft Careers"
  if (role) {
    role = role.replace(/\s*\|\s*.*careers.*$/i, '').trim();
    role = role.replace(/\s*-\s*.*careers.*$/i, '').trim();
  }

  // Company detection from lines[1] if still empty
  if (!company && fallbackRawText) {
    const lines = fallbackRawText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines[1].length < 40 && !lines[1].includes('$') && !lines[1].includes(':') && !/^(remote|hybrid|onsite|http)/i.test(lines[1])) {
      company = lines[1].trim();
    }
  }

  // Universal Salary parsing if not found in Schema
  if (!salaryMin && !salaryMax) {
    const combinedText = `${description} ${fallbackRawText || ''}`;
    const salMatch = combinedText.match(
      /(?:base (?:salary|pay|compensation)|salary range|compensation|pay range)?[:\s]*\$(\d{2,3}(?:,\d{3})*|\d{2,3}k)\s*(?:–|-|to)\s*\$?(\d{2,3}(?:,\d{3})*|\d{2,3}k)/i
    );
    if (salMatch) {
      const cleanNum = (str: string) => {
        let s = str.toLowerCase().replace(/,/g, '');
        if (s.endsWith('k')) return parseInt(s.replace('k', ''), 10) * 1000;
        return parseInt(s, 10);
      };
      salaryMin = cleanNum(salMatch[1]);
      salaryMax = cleanNum(salMatch[2]);
    } else {
      const hourlyMatch = combinedText.match(
        /\$(\d{2,3}(?:\.\d{2})?)\s*(?:–|-|to)\s*\$?(\d{2,3}(?:\.\d{2})?)\s*(?:\/hr|per hour|\/hour)/i
      );
      if (hourlyMatch) {
        const hMin = parseFloat(hourlyMatch[1]);
        const hMax = parseFloat(hourlyMatch[2]);
        salaryMin = Math.round(hMin * 2080);
        salaryMax = Math.round(hMax * 2080);
      }
    }
  }

  const rawFormatted = sanitizeRichTextHtml(fallbackRawText || description);

  return {
    company: company || 'Hiring Company',
    role: role || 'Open Position',
    location: location || 'Remote / Unspecified',
    jobType,
    salaryMin,
    salaryMax,
    salaryCurrency,
    requirements:
      requirements.length > 0
        ? requirements
        : [
            'Demonstrated experience building and delivering production software',
            'Proficiency in core programming languages and frameworks relevant to the role',
            'Strong collaboration skills with engineering, product, and design teams',
          ],
    description: description.slice(0, 3000) || 'Job posting description extracted from employer listing.',
    rawDescription: rawFormatted,
    hasJobPostingSchema,
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    authConfigured: Boolean(process.env.CLERK_SECRET_KEY || process.env.API_AUTH_TOKEN),
    distributedRateLimitingConfigured: isDistributedRateLimitingConfigured(),
    inngestConfigured: isInngestConfigured(),
  });
});

app.get('/api/sync/bootstrap', requireApiAuth, async (_req, res) => {
  try {
    const userId = res.locals.userId as string;
    await ensureUser(userId);
    return res.json({ success: true, data: await getUserSnapshot(userId) });
  } catch (error) {
    console.error('Cloud bootstrap failed:', error);
    return res.status(503).json({ error: 'Cloud persistence is not configured or unavailable.' });
  }
});

app.post('/api/sync/operations', requireApiAuth, rateLimit(60, 60 * 1000), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const operations = req.body?.operations;
    if (!Array.isArray(operations) || operations.length < 1 || operations.length > 50) {
      return res.status(400).json({ error: 'Provide between 1 and 50 sync operations.' });
    }
    if (
      operations.some(
        (operation) =>
          !operation?.id ||
          !['application', 'profile', 'resume', 'privacy', 'atsResult', 'interviewDossier'].includes(operation.entityType) ||
          !['upsert', 'delete'].includes(operation.operation) ||
          !operation.entityId ||
          !operation.payload ||
          typeof operation.payload !== 'object' ||
          Array.isArray(operation.payload),
      )
    ) {
      return res.status(400).json({ error: 'Invalid sync operation.' });
    }
    await ensureUser(userId);
    const results = [];
    for (const operation of operations as SyncOperationInput[]) {
      results.push({ id: operation.id, status: await applySyncOperation(userId, operation) });
    }
    return res.json({ success: true, results });
  } catch (error) {
    console.error('Cloud sync failed:', error);
    return res.status(503).json({ error: 'Cloud persistence is not configured or unavailable.' });
  }
});

app.post('/api/sync/operations/async', requireApiAuth, rateLimit(20, 60 * 1000), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const operations = req.body?.operations;
    if (!Array.isArray(operations) || operations.length < 1 || operations.length > 50) {
      return res.status(400).json({ error: 'Provide between 1 and 50 sync operations.' });
    }
    if (
      operations.some(
        (operation) =>
          !operation?.id ||
          !operation.entityId ||
          !['application', 'profile', 'resume', 'privacy', 'atsResult', 'interviewDossier'].includes(operation.entityType) ||
          !['upsert', 'delete'].includes(operation.operation) ||
          !operation.payload ||
          typeof operation.payload !== 'object' ||
          Array.isArray(operation.payload),
      )
    ) {
      return res.status(400).json({ error: 'Invalid sync operation.' });
    }
    await inngest.send({
      name: 'careerpilot/sync.requested',
      data: { userId, operations },
    });
    return res.status(202).json({ success: true, queued: operations.length });
  } catch (error) {
    console.error('Unable to queue cloud sync:', error);
    return res.status(503).json({ error: 'Background processing is unavailable.' });
  }
});

app.post('/api/ai/jobs', requireApiAuth, rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const kind = req.body?.kind;
    const payload = req.body?.payload;
    if (!['scrape', 'ats', 'interview'].includes(kind)) {
      return res.status(400).json({ error: 'Invalid AI job type.' });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ error: 'AI job payload must be an object.' });
    }
    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload.length > 25_000) {
      return res.status(413).json({ error: 'AI job payload is too large.' });
    }
    const jobId = crypto.randomUUID();
    await ensureUser(userId);
    await createAiJob({ id: jobId, userId, kind, payload });
    await inngest.send({
      name: 'careerpilot/ai.requested',
      data: { userId, jobId, kind: kind as AiJobKind, payload },
    });

    app.get('/api/ai/jobs/:jobId', requireApiAuth, async (req, res) => {
      try {
        const userId = res.locals.userId as string;
        const job = await getAiJob(userId, req.params.jobId);
        if (!job) return res.status(404).json({ error: 'AI job not found.' });
        return res.json({ success: true, job });
      } catch (error) {
        console.error('Unable to read AI job:', error);
        return res.status(503).json({ error: 'AI job status is unavailable.' });
      }
    });
    return res.status(202).json({ success: true, jobId, kind });
  } catch (error) {
    console.error('Unable to queue AI job:', error);
    return res.status(503).json({ error: 'Background processing is unavailable.' });
  }
});

app.post('/api/resumes/:resumeId/file', requireApiAuth, rateLimit(20, 15 * 60 * 1000), async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const { base64, fileType } = req.body || {};
    if (typeof base64 !== 'string' || typeof fileType !== 'string') {
      return res.status(400).json({ error: 'Resume file data and type are required.' });
    }
    const resume = await getOwnedResumeVersion(userId, req.params.resumeId);
    if (!resume) return res.status(404).json({ error: 'Resume version not found.' });
    const buffer = decodeResumeData(base64, fileType.toLowerCase());
    const blob = await uploadPrivateResume(userId, resume.id, fileType.toLowerCase(), buffer);
    await updateResumeFile(userId, resume.id, {
      filePath: blob.pathname,
      fileType: fileType.toLowerCase(),
      fileSize: blob.size,
    });
    return res.json({ success: true, data: { filePath: blob.pathname, fileType, fileSize: blob.size } });
  } catch (error) {
    console.error('Private resume upload failed:', error);
    return res.status(503).json({ error: 'Unable to store the private resume file.' });
  }
});

app.get('/api/resumes/:resumeId/file', requireApiAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const resume = await getOwnedResumeVersion(userId, req.params.resumeId);
    if (!resume?.filePath) return res.status(404).json({ error: 'Resume file not found.' });
    const blob = await readPrivateResume(resume.filePath);
    if (!blob || blob.statusCode !== 200) return res.status(404).json({ error: 'Resume file not found.' });
    res.setHeader('Content-Type', blob.blob.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.versionName}.${resume.fileType || 'bin'}"`);
    return res.status(200).send(Buffer.from(await new Response(blob.stream).arrayBuffer()));
  } catch (error) {
    console.error('Private resume download failed:', error);
    return res.status(503).json({ error: 'Unable to retrieve the private resume file.' });
  }
});

app.delete('/api/resumes/:resumeId/file', requireApiAuth, async (req, res) => {
  try {
    const userId = res.locals.userId as string;
    const resume = await getOwnedResumeVersion(userId, req.params.resumeId);
    if (!resume?.filePath) return res.status(404).json({ error: 'Resume file not found.' });
    await deletePrivateResume(resume.filePath);
    await updateResumeFile(userId, resume.id, { filePath: '', fileType: '', fileSize: 0 });
    return res.json({ success: true });
  } catch (error) {
    console.error('Private resume deletion failed:', error);
    return res.status(503).json({ error: 'Unable to delete the private resume file.' });
  }
});

// Document Upload & Parsing Endpoint (PDF, DOCX, TXT, MD)
app.post('/api/documents/parse', requireApiAuth, rateLimit(20, 15 * 60 * 1000), async (req, res) => {
  try {
    const { base64, fileName, fileType } = req.body;

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'No document file data provided.' });
    }

    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
    if (cleanBase64.length > 14 * 1024 * 1024) {
      return res.status(413).json({ error: 'Document exceeds the 10 MB upload limit.' });
    }
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Document exceeds the 10 MB upload limit.' });
    }
    const ext = (fileType || fileName?.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'docx', 'txt', 'md'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported document type.' });
    }
    const header = buffer.subarray(0, 8);
    const validSignature =
      (ext === 'pdf' && header.toString('ascii', 0, 4) === '%PDF') ||
      (ext === 'docx' && header[0] === 0x50 && header[1] === 0x4b) ||
      (ext === 'txt' || ext === 'md');
    if (!validSignature) {
      return res.status(400).json({ error: 'File contents do not match the declared document type.' });
    }

    let text = '';

    if (ext === 'pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text || '';
      } catch (pdfErr) {
        console.warn('PDF parsing fallback to raw text extraction:', pdfErr);
        text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    } else if (ext === 'docx') {
      try {
        const mammothFn = (mammoth as any).extractRawText || (mammoth as any).default?.extractRawText;
        const result = await mammothFn({ buffer });
        text = result.value || '';
      } catch (docxErr) {
        console.error('DOCX parsing error:', docxErr);
        throw new Error('Failed to read DOCX document content.');
      }
    } else {
      text = buffer.toString('utf-8');
    }

    // Clean whitespace and normalize line breaks
    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!text || text.length < 10) {
      return res.status(400).json({
        error: 'Could not extract readable text from document. Please ensure it is not an image-only scanned file.',
      });
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    res.json({
      success: true,
      data: {
        text,
        wordCount,
        fileName: fileName || 'Uploaded_Resume',
        fileType: ext || 'pdf',
        fileSize: buffer.length,
      },
    });
  } catch (err: unknown) {
    console.error('Document parse error:', err);
    const message = err instanceof Error ? err.message : 'Failed to extract text from document';
    res.status(500).json({ error: message });
  }
});

// 1. Scrape & Extract Job Postings
app.post('/api/jobs/scrape', requireApiAuth, rateLimit(20, 15 * 60 * 1000), async (req, res) => {
  let rawHtml = '';
  let usedHeadless = false;

  try {
    const { url, rawText } = req.body;
    const cleanUrl = url && typeof url === 'string' ? url.trim() : '';

    if (!cleanUrl && (!rawText || typeof rawText !== 'string' || rawText.trim().length < 10)) {
      return res.status(400).json({
        error: 'Please provide either a valid job posting URL or paste the job description text.',
      });
    }

    // Validate before any external request, including fallback services.
    if (cleanUrl) {
      try {
        await assertPublicHttpUrl(cleanUrl);
      } catch (validationError) {
        const message =
          validationError instanceof Error ? validationError.message : 'Invalid job posting URL.';
        return res.status(400).json({ error: message });
      }
    }

    // Tier 1: Direct HTTP fetch for static/server-rendered job boards
    if (cleanUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetchPublicUrl(cleanUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          rawHtml = await readResponseText(response);
        }
      } catch (fetchError) {
        console.warn('Direct fetch failed or timed out:', fetchError);
      }
    }

    // Parse structured data from direct HTML (if any)
    let parsedFromHtml = parseHtmlJobData(rawHtml, cleanUrl, rawText);

    // Evaluate whether direct fetch got genuine job content
    const isDirectSparse = !parsedFromHtml.hasJobPostingSchema && parsedFromHtml.description.length < 150;
    const directFailed = !rawHtml || rawHtml.length < 350;

    // Tier 2: Universal Headless Reader (Universal SPA / Bot-Guarded / Career Board Support)
    if (cleanUrl && (directFailed || isDirectSparse)) {
      console.log(`Direct fetch yielded sparse/empty content for ${cleanUrl}. Engaging Universal Headless Reader...`);
      try {
        const headlessText = await fetchUniversalHeadless(cleanUrl);
        if (headlessText && headlessText.trim().length > 150) {
          const cleanedHeadless = cleanHeadlessContent(headlessText);
          const parsedHeadless = parseHtmlJobData('', cleanUrl, cleanedHeadless);
          if (parsedHeadless.description.length > 80 || cleanedHeadless.length > 250) {
            parsedFromHtml = parsedHeadless;
            parsedFromHtml.rawDescription = sanitizeRichTextHtml(cleanedHeadless);
            usedHeadless = true;
            console.log(`Universal Headless Reader succeeded! Extracted ${cleanedHeadless.length} chars.`);
          }
        }
      } catch (headlessErr) {
        console.warn('Universal Headless Reader failed:', headlessErr);
      }
    }

    // Tier 3: Universal Search Grounding Fallback
    // Engages only if both direct fetch AND headless reader returned sparse or empty content
    const stillSparse = !parsedFromHtml.hasJobPostingSchema && parsedFromHtml.description.length < 80;
    if (cleanUrl && !usedHeadless && (directFailed || stillSparse)) {
      try {
        console.log(`Direct & headless were sparse/blocked. Engaging Google Search Grounding for: ${cleanUrl}`);

        let searchTokens = cleanUrl;
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.replace('www.', '');
          const pathSegments = urlObj.pathname
            .split('/')
            .filter((s) => s.length > 2 && !/careers|job|jobs|position/i.test(s))
            .join(' ');
          searchTokens = `${domain} ${pathSegments}`;
        } catch {}

        const searchPrompt = `Search the web to find the complete public job posting for: "${cleanUrl}" (Search keywords: ${searchTokens}).
Extract:
1. Company name (e.g. Microsoft, Google, Amazon, Stripe, etc.)
2. Official Job Title / Role
3. Location (city, state/country, or Remote)
4. Job Type: exactly one of 'remote', 'hybrid', or 'onsite'
5. Salary range: min and max as annual numbers. Look carefully for inline compensation disclosures or hourly rates. If hourly, convert to annual (rate * 2080).
6. Salary currency code (e.g. 'USD', 'CAD')
7. Key requirements and qualifications as 4 to 8 clear bullet points
8. Comprehensive job description, role overview, company mission, and full benefits package (health, 401k, equity, PTO, stipends).
9. rawDescription: The full public posting formatted as clean rich-text HTML using <p>, <ul>, <ol>, <li>, <h3>, <strong> tags, strictly preserving all bulleted lists, numbered lists, and sub-bullet indentation.

Return your answer strictly as a JSON object inside a \`\`\`json block with keys: company, role, location, jobType, salaryMin, salaryMax, salaryCurrency, requirements (array of strings), description (string), rawDescription (string of rich-text HTML with preserved lists).`;

        const searchResponse = await callAIWithRetry(async () => {
          return await ai.generateContent({
            model: DEFAULT_MODEL,
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
        }, 2, 800);

        const searchGroundingText = searchResponse.text || '';
        const jsonMatch = searchGroundingText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || searchGroundingText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedSearch = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (parsedSearch.company || parsedSearch.role) {
            const rawGroundedDesc = sanitizeRichTextHtml(
              parsedSearch.rawDescription || parsedSearch.description || parsedFromHtml.rawDescription || ''
            );
            return res.json({
              success: true,
              isFallback: false,
              groundedWithSearch: true,
              data: {
                company: parsedSearch.company || parsedFromHtml.company,
                role: parsedSearch.role || parsedFromHtml.role,
                location: parsedSearch.location || parsedFromHtml.location,
                jobType: ['remote', 'hybrid', 'onsite'].includes(parsedSearch.jobType?.toLowerCase())
                  ? parsedSearch.jobSchemaType.toLowerCase()
                  : parsedFromHtml.jobType,
                salaryMin: parsedSearch.salaryMin || parsedFromHtml.salaryMin || undefined,
                salaryMax: parsedSearch.salaryMax || parsedFromHtml.salaryMax || undefined,
                salaryCurrency: parsedSearch.salaryCurrency || 'USD',
                requirements:
                  Array.isArray(parsedSearch.requirements) && parsedSearch.requirements.length > 0
                    ? parsedSearch.requirements
                    : parsedFromHtml.requirements,
                description: parsedSearch.description || parsedFromHtml.description,
                rawDescription: rawGroundedDesc,
                url: cleanUrl || '',
              },
            });
          }
        }
      } catch (searchErr) {
        console.warn('Google Search grounding fallback failed, continuing to standard flow:', searchErr);
      }
    }

    // Build focused context for Gemini
    const focusedContext = `JOB POSTING SOURCE CONTEXT:
${url ? `URL: ${url}\n` : ''}
COMPANY: ${parsedFromHtml.company}
ROLE: ${parsedFromHtml.role}
LOCATION: ${parsedFromHtml.location}
DESCRIPTION & REQUIREMENTS:
${parsedFromHtml.description}
${parsedFromHtml.requirements.map((r) => `- ${r}`).join('\n')}

RAW RICH-TEXT CONTENT BUFFER:
${parsedFromHtml.rawDescription || parsedFromHtml.description}`;

    const prompt = `You are an expert career intelligence system. Analyze the following job posting context and extract clean structured job application details.

${focusedContext}

Extract:
1. Company name (e.g. "Microsoft").
2. Official Job Role / Title (clean title like "Senior Software Engineer").
3. Location (e.g. "Vancouver, BC, Canada" or "Remote").
4. Job Type: exactly one of 'remote', 'hybrid', or 'onsite'.
5. Salary minimum and maximum as numbers. Check thoroughly for any inline compensation, base pay ranges, or hourly rates stated in the text. Convert hourly to 40hr/wk annual (rate * 2080). If no salary is disclosed, leave as null.
6. Salary currency code (e.g., 'USD', 'CAD', 'EUR', 'GBP'). Default to 'USD' or local currency.
7. Key requirements and qualifications as a concise array of 4 to 8 clear bullet items.
8. Comprehensive role overview, company mission, responsibilities, and complete benefits (health, 401k, equity, PTO, perks) in the description field.
9. rawDescription: Clean sanitized rich-text HTML preserving all original paragraphs, bullet lists (<ul class="job-rich-ul"><li>), numbered lists (<ol class="job-rich-ol"><li>), and nested indentation (style="margin-left: 1.5rem;").
Return valid JSON matching the schema.`;

    try {
      const response = await callAIWithRetry(async () => {
        return await ai.generateContent({
          model: DEFAULT_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                company: { type: SchemaType.STRING },
                role: { type: SchemaType.STRING },
                location: { type: SchemaType.STRING },
                jobType: { type: SchemaType.STRING },
                salaryMin: { type: SchemaType.NUMBER },
                salaryMax: { type: SchemaType.NUMBER },
                salaryCurrency: { type: SchemaType.STRING },
                requirements: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
                description: { type: SchemaType.STRING },
                rawDescription: { type: SchemaType.STRING },
              },
              required: ['company', 'role', 'location', 'jobType', 'requirements', 'description'],
            },
          },
        });
      }, 2, 600);

      const parsedData = validateScrapeResult(JSON.parse(response.text || '{}'));
      const company = typeof parsedData.company === 'string' ? parsedData.company : parsedFromHtml.company;
      const role = typeof parsedData.role === 'string' ? parsedData.role : parsedFromHtml.role;
      const location = typeof parsedData.location === 'string' ? parsedData.location : parsedFromHtml.location;
      const jobType = typeof parsedData.jobType === 'string' ? parsedData.jobType : parsedFromHtml.jobType;
      const description = typeof parsedData.description === 'string' ? parsedData.description : parsedFromHtml.description;
      const rawDescription = typeof parsedData.rawDescription === 'string' ? parsedData.rawDescription : undefined;
      const sanitizedRaw = sanitizeRichTextHtml(
        rawDescription || parsedFromHtml.rawDescription || description
      );

      return res.json({
        success: true,
        isFallback: false,
        data: {
          company,
          role,
          location,
          jobType: ['remote', 'hybrid', 'onsite'].includes(jobType.toLowerCase())
            ? jobType
            : parsedFromHtml.jobType,
          salaryMin: parsedData.salaryMin || parsedFromHtml.salaryMin || undefined,
          salaryMax: parsedData.salaryMax || parsedFromHtml.salaryMax || undefined,
          salaryCurrency: parsedData.salaryCurrency || parsedFromHtml.salaryCurrency || 'USD',
          requirements:
            Array.isArray(parsedData.requirements) && parsedData.requirements.length > 0
              ? parsedData.requirements
              : parsedFromHtml.requirements,
          description: parsedData.description || parsedFromHtml.description,
          rawDescription: sanitizedRaw,
          url: url || '',
        },
      });
    } catch (geminiError: unknown) {
      console.warn('Gemini extraction unavailable, engaging structured HTML fallback:', geminiError);

      return res.json({
        success: true,
        isFallback: true,
        fallbackNotice:
          'The AI model is momentarily experiencing high demand. Extracted structured details directly from employer listing.',
        data: {
          company: parsedFromHtml.company,
          role: parsedFromHtml.role,
          location: parsedFromHtml.location,
          jobType: parsedFromHtml.jobType,
          salaryMin: parsedFromHtml.salaryMin,
          salaryMax: parsedFromHtml.salaryMax,
          salaryCurrency: parsedFromHtml.salaryCurrency,
          requirements: parsedFromHtml.requirements,
          description: parsedFromHtml.description,
          rawDescription: parsedFromHtml.rawDescription || sanitizeRichTextHtml(parsedFromHtml.description),
          url: url || '',
        },
      });
    }
  } catch (err: unknown) {
    console.error('Scrape error:', err);
    const message = err instanceof Error ? err.message : 'Failed to extract job posting details';
    res.status(500).json({ error: message });
  }
});

// 2. ATS Resume to Job Keyword Gap Analysis
app.post('/api/resumes/analyze-match', requireApiAuth, rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { jobDescription, requirements, resumeText, roleTitle, company } = req.body;

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        error: 'Please provide a valid resume version with substantive text to compare.',
      });
    }

    const prompt = `You are a top-tier Applicant Tracking System (ATS) evaluator and executive technical recruiter.
Evaluate the candidate's resume version against the target job posting for "${roleTitle || 'Target Role'}" at "${company || 'Target Company'}".

JOB REQUIREMENTS:
${Array.isArray(requirements) ? requirements.map((r: string) => `- ${r}`).join('\n') : ''}

JOB DESCRIPTION:
${jobDescription ? jobDescription.slice(0, 4000) : 'Not provided'}

CANDIDATE'S RESUME:
${resumeText.slice(0, 6000)}

Perform a thorough, realistic keyword match and ATS audit:
1. "score": An objective ATS match percentage (0 to 100) based on hard skills, methodologies, tools, and domain experience.
2. "matchedKeywords": Array of 5-15 matching keywords and technical terms found in both.
3. "missingKeywords": Array of missing or weak high-impact keywords with:
   - "keyword": exact skill or term
   - "importance": "high" | "medium" | "low"
   - "category": "hard-skill" | "soft-skill" | "tool" | "certification"
   - "context": brief explanation of why this keyword is needed for this role.
4. "bulletSuggestions": Array of 3-5 high-impact resume bullet points that the candidate should add or adapt, formulated with strong action verbs and quantified impact metrics (XYZ format: Accomplished [X] as measured by [Y], by doing [Z]).
   - "originalBullet": optional previous resume bullet or null
   - "suggestedBullet": rewritten metric-driven bullet
   - "targetKeyword": keyword targeted
   - "rationale": why this strengthens the ATS profile.
5. "strengths": Array of 3-4 candidate strengths for this role.
6. "tailoringAdvice": 1-2 paragraphs of actionable advice for standing out in this specific application.`;

    const response = await callAIWithRetry(async () => {
      return await ai.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              score: { type: SchemaType.INTEGER, description: 'Overall ATS match score 0-100' },
              matchedKeywords: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: 'Keywords found in both resume and job description',
              },
              missingKeywords: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    keyword: { type: SchemaType.STRING },
                    importance: { type: SchemaType.STRING, description: 'high, medium, or low' },
                    category: { type: SchemaType.STRING, description: 'hard-skill, soft-skill, tool, certification' },
                    context: { type: SchemaType.STRING },
                  },
                  required: ['keyword', 'importance', 'category', 'context'],
                },
              },
              bulletSuggestions: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    originalBullet: { type: SchemaType.STRING },
                    suggestedBullet: { type: SchemaType.STRING },
                    targetKeyword: { type: SchemaType.STRING },
                    rationale: { type: SchemaType.STRING },
                  },
                  required: ['suggestedBullet', 'targetKeyword', 'rationale'],
                },
              },
              strengths: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
              tailoringAdvice: { type: SchemaType.STRING },
            },
            required: [
              'score',
              'matchedKeywords',
              'missingKeywords',
              'bulletSuggestions',
              'strengths',
              'tailoringAdvice',
            ],
          },
        },
      });
    }, 3, 1000);

    const parsed = validateAtsResult(JSON.parse(response.text || '{}'));
    return res.json({
      success: true,
      data: {
        ...parsed,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error('Match analysis error:', err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isBusy = rawMsg.includes('503') || rawMsg.includes('429') || rawMsg.includes('high demand');
    const message = isBusy
      ? 'The AI evaluation model is momentarily experiencing high demand. Please retry in a few moments.'
      : 'Failed to analyze resume keywords.';
    res.status(isBusy ? 503 : 500).json({ error: message });
  }
});

// 3. Interview Prep Grounded in Real Internet Experiences
app.post('/api/interviews/generate-prep', requireApiAuth, rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const { company, role, jobDescription, resumeText } = req.body;

    if (!company || !role) {
      return res.status(400).json({ error: 'Company name and role are required.' });
    }

    const userPrompt = `Research real-world interview experiences and interview questions for the role "${role}" at "${company}".
Synthesize authentic insights from past candidates, Glassdoor, Reddit, Blind, and tech hiring reports.

CANDIDATE'S RESUME HIGHLIGHTS:
${resumeText ? resumeText.slice(0, 3000) : 'General candidate profile matching requirements'}

TARGET JOB DESCRIPTION:
${jobDescription ? jobDescription.slice(0, 2500) : 'Standard role expectations'}

Provide a comprehensive, high-value interview preparation dossier:
1. COMPANY OVERVIEW & INTERVIEW CULTURE: What is ${company}'s known hiring style, cultural values (e.g. Leadership Principles, Bar Raiser, cross-functional collaboration), and overall interview difficulty?
2. INTERVIEW STAGES: Detail the typical interview pipeline stages for this role (e.g. Recruiter phone screen, Technical phone screen, Virtual Onsite rounds).
3. PAST CANDIDATE EXPERIENCES: List 2 to 4 real reported experiences from recent candidate interviews at ${company} for ${role} or related engineering/product teams (mentioning sources like Glassdoor, Reddit, or candidate reports, the format, and difficulty).
4. TECHNICAL QUESTIONS & MODEL ANSWERS: 4 to 6 specific technical/domain questions asked at ${company} for ${role}, with topics and exemplary model answers.
5. BEHAVIORAL QUESTIONS WITH STAR ANSWERS: 3 to 4 behavioral questions tailored to ${company}'s culture, complete with model STAR answers (Situation, Task, Action, Result) mapped directly to candidate resume strengths.
6. TIPS FOR SUCCEEDING AT ${company}: 4 to 5 insider tips.

Format your response as clean JSON with this exact structure:
{
  "companyOverview": "...",
  "interviewStages": ["Stage 1...", "Stage 2..."],
  "pastCandidateExperiences": [
    { "source": "...", "summary": "...", "difficulty": "...", "roleRelevance": "...", "interviewFormat": "..." }
  ],
  "technicalQuestions": [
    { "question": "...", "topic": "...", "importance": "...", "sampleAnswer": "..." }
  ],
  "behavioralQuestions": [
    {
      "question": "...",
      "competency": "...",
      "starFramework": {
        "situation": "...",
        "task": "...",
        "action": "...",
        "result": "..."
      }
    }
  ],
  "tipsForCompany": ["..."]
}`;

    // Enable Google Search grounding with retry
    const response = await callAIWithRetry(async () => {
      return await ai.generateContent({
        model: DEFAULT_MODEL,
        contents: userPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
    }, 3, 1000);

    const responseText = response.text || '';

    // Extract grounding URLs if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: { title: string; uri: string }[] = [];
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
          });
        }
      }
    }

    // Parse JSON from text
    let parsedJson: any = null;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const rawJsonStr = jsonMatch[1] || jsonMatch[0];
        parsedJson = JSON.parse(rawJsonStr);
      } catch (parseErr) {
        console.warn('Direct regex JSON parse failed, falling back to structured extractor');
      }
    }

    if (!parsedJson) {
      // Fallback structured generation
      const fallbackResponse = await callAIWithRetry(async () => {
        return await ai.generateContent({
          model: DEFAULT_MODEL,
          contents: `Convert this interview report into valid JSON:\n\n${responseText.slice(0, 6000)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                companyOverview: { type: SchemaType.STRING },
                interviewStages: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                pastCandidateExperiences: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      source: { type: SchemaType.STRING },
                      summary: { type: SchemaType.STRING },
                      difficulty: { type: SchemaType.STRING },
                      roleRelevance: { type: SchemaType.STRING },
                      interviewFormat: { type: SchemaType.STRING },
                    },
                    required: ['source', 'summary', 'roleRelevance'],
                  },
                },
                technicalQuestions: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      question: { type: SchemaType.STRING },
                      topic: { type: SchemaType.STRING },
                      importance: { type: SchemaType.STRING },
                      sampleAnswer: { type: SchemaType.STRING },
                    },
                    required: ['question', 'topic', 'sampleAnswer'],
                  },
                },
                behavioralQuestions: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      question: { type: SchemaType.STRING },
                      competency: { type: SchemaType.STRING },
                      starFramework: {
                        type: SchemaType.OBJECT,
                        properties: {
                          situation: { type: SchemaType.STRING },
                          task: { type: SchemaType.STRING },
                          action: { type: SchemaType.STRING },
                          result: { type: SchemaType.STRING },
                        },
                        required: ['situation', 'task', 'action', 'result'],
                      },
                    },
                    required: ['question', 'competency', 'starFramework'],
                  },
                },
                tipsForCompany: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
              },
              required: [
                'companyOverview',
                'interviewStages',
                'pastCandidateExperiences',
                'technicalQuestions',
                'behavioralQuestions',
                'tipsForCompany',
              ],
            },
          },
        });
      }, 2, 1000);
      parsedJson = JSON.parse(fallbackResponse.text || '{}');
    }

    const validatedInterview = validateInterviewResult(parsedJson);
    return res.json({
      success: true,
      data: {
        ...validatedInterview,
        groundingSources: sources.slice(0, 6),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error('Interview prep error:', err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isBusy = rawMsg.includes('503') || rawMsg.includes('429') || rawMsg.includes('high demand');
    const message = isBusy
      ? 'The AI intelligence service is momentarily experiencing high demand. Please retry in a few moments.'
      : 'Failed to generate interview preparation dossier.';
    res.status(isBusy ? 503 : 500).json({ error: message });
  }
});

export default app;

// Setup Vite middleware in dev or static serving in prod
async function startServer() {
  const httpServer = http.createServer(app);

  if (!isProduction) {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CareerPilot server listening on http://0.0.0.0:${PORT}`);
  });
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMainModule) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

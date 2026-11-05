import { KeywordAnalysisResult, InterviewPrepDossier } from '../types/job';
import { getAuthHeaders } from './auth';

export interface ScrapeJobPayload {
  url?: string;
  rawText?: string;
}

export interface ScrapedJobResponse {
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
  url: string;
  isFallback?: boolean;
  fallbackNotice?: string;
}

function cleanErrorMessage(raw: string): string {
  if (!raw) return 'Operation failed. Please try again.';
  try {
    // If it's a JSON string like {"error":{"code":503,"message":"..."}}
    if (raw.trim().startsWith('{') && raw.includes('"message"')) {
      const parsed = JSON.parse(raw);
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    }
  } catch {
    // Return original cleaned string
  }
  return raw;
}

export const apiService = {
  async scrapeJob(payload: ScrapeJobPayload): Promise<ScrapedJobResponse> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch('/api/jobs/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(cleanErrorMessage(data.error || 'Failed to extract job posting details.'));
    }
    return {
      ...data.data,
      isFallback: data.isFallback,
      fallbackNotice: data.fallbackNotice,
    };
  },

  async analyzeResumeMatch(params: {
    jobDescription: string;
    requirements: string[];
    resumeText: string;
    roleTitle: string;
    company: string;
  }): Promise<KeywordAnalysisResult> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch('/api/resumes/analyze-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        cleanErrorMessage(data.error || 'Failed to analyze resume match against job description.')
      );
    }
    return data.data;
  },

  async generateInterviewPrep(params: {
    company: string;
    role: string;
    jobDescription: string;
    resumeText: string;
  }): Promise<InterviewPrepDossier> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch('/api/interviews/generate-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        cleanErrorMessage(data.error || 'Failed to curate interview preparation dossier.')
      );
    }
    return data.data;
  },

  async parseDocument(payload: {
    base64: string;
    fileName: string;
    fileType?: string;
  }): Promise<{
    text: string;
    wordCount: number;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch('/api/documents/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(cleanErrorMessage(data.error || 'Failed to parse resume document.'));
    }
    return data.data;
  },
};

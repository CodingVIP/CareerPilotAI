import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAtsResult, validateInterviewResult, validateScrapeResult } from '../src/server/aiValidation';

test('validates and normalizes scraped job data', () => {
  const result = validateScrapeResult({
    company: 'Acme',
    role: 'Engineer',
    location: 'Remote',
    jobType: 'REMOTE',
    requirements: ['TypeScript'],
    description: 'Build software.',
  });
  assert.equal(result.jobType, 'remote');
});

test('rejects malformed ATS output', () => {
  assert.throws(
    () => validateAtsResult({ score: 101, matchedKeywords: [], missingKeywords: [], bulletSuggestions: [], strengths: [], tailoringAdvice: 'x' }),
    /invalid ATS score/i,
  );
});

test('rejects incomplete interview output', () => {
  assert.throws(
    () => validateInterviewResult({ companyOverview: 'Acme', interviewStages: [], tipsForCompany: [] }),
    /past candidate experiences/i,
  );
});

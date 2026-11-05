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

test('accepts ATS bullet suggestions without an original bullet', () => {
  const result = validateAtsResult({
    score: 80,
    matchedKeywords: ['TypeScript'],
    missingKeywords: [{
      keyword: 'React',
      importance: 'high',
      category: 'hard-skill',
      context: 'Required by the posting.',
    }],
    bulletSuggestions: [{
      suggestedBullet: 'Improved performance by 20% using React.',
      targetKeyword: 'React',
      rationale: 'Adds a missing hard skill.',
    }],
    strengths: ['Strong engineering background'],
    tailoringAdvice: 'Emphasize measurable outcomes.',
  });
  assert.equal(result.score, 80);
});

test('rejects incomplete interview output', () => {
  assert.throws(
    () => validateInterviewResult({ companyOverview: 'Acme', interviewStages: [], tipsForCompany: [] }),
    /past candidate experiences/i,
  );
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`AI response is missing ${field}.`);
  return value.trim();
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`AI response contains an invalid ${field}.`);
  }
  return value;
}

function requireRecordArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new Error(`AI response contains an invalid ${field}.`);
  }
  return value;
}

export function validateScrapeResult(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('AI returned an invalid job posting.');
  requireString(value.company, 'company');
  requireString(value.role, 'role');
  requireString(value.location, 'location');
  const jobType = requireString(value.jobType, 'job type').toLowerCase();
  if (!['remote', 'hybrid', 'onsite'].includes(jobType)) throw new Error('AI returned an invalid job type.');
  requireStringArray(value.requirements, 'requirements');
  requireString(value.description, 'description');
  return { ...value, jobType };
}

export function validateAtsResult(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('AI returned an invalid ATS analysis.');
  if (typeof value.score !== 'number' || !Number.isFinite(value.score) || value.score < 0 || value.score > 100) {
    throw new Error('AI returned an invalid ATS score.');
  }
  requireStringArray(value.matchedKeywords, 'matched keywords');
  requireStringArray(value.strengths, 'strengths');
  requireString(value.tailoringAdvice, 'tailoring advice');
  const missingKeywords = requireRecordArray(value.missingKeywords, 'missing keywords');
  const bulletSuggestions = requireRecordArray(value.bulletSuggestions, 'bullet suggestions');
  for (const keyword of missingKeywords) {
    requireString(keyword.keyword, 'missing keyword');
    if (!['high', 'medium', 'low'].includes(requireString(keyword.importance, 'keyword importance'))) {
      throw new Error('AI returned an invalid keyword importance.');
    }
    if (!['hard-skill', 'soft-skill', 'tool', 'certification'].includes(requireString(keyword.category, 'keyword category'))) {
      throw new Error('AI returned an invalid keyword category.');
    }
    requireString(keyword.context, 'keyword context');
  }
  for (const suggestion of bulletSuggestions) {
    if (suggestion.originalBullet !== undefined && suggestion.originalBullet !== null) {
      requireString(suggestion.originalBullet, 'original bullet');
    }
    requireString(suggestion.suggestedBullet, 'suggested bullet');
    requireString(suggestion.targetKeyword, 'target keyword');
    requireString(suggestion.rationale, 'bullet rationale');
  }
  return value;
}

export function validateInterviewResult(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('AI returned an invalid interview dossier.');
  requireString(value.companyOverview, 'company overview');
  requireStringArray(value.interviewStages, 'interview stages');
  requireStringArray(value.tipsForCompany, 'company tips');
  const experiences = requireRecordArray(value.pastCandidateExperiences, 'past candidate experiences');
  const technical = requireRecordArray(value.technicalQuestions, 'technical questions');
  const behavioral = requireRecordArray(value.behavioralQuestions, 'behavioral questions');
  for (const item of experiences) {
    requireString(item.source, 'experience source');
    requireString(item.summary, 'experience summary');
    requireString(item.roleRelevance, 'experience role relevance');
  }
  for (const item of technical) {
    requireString(item.question, 'technical question');
    requireString(item.topic, 'technical topic');
    requireString(item.sampleAnswer, 'technical sample answer');
  }
  for (const item of behavioral) {
    requireString(item.question, 'behavioral question');
    requireString(item.competency, 'behavioral competency');
    if (!isRecord(item.starFramework)) throw new Error('AI returned an invalid STAR framework.');
    for (const field of ['situation', 'task', 'action', 'result']) {
      requireString(item.starFramework[field], `STAR ${field}`);
    }
  }
  if (value.groundingSources !== undefined) {
    const sources = requireStringArray(value.groundingSources, 'grounding sources');
    for (const source of sources) {
      try {
        const url = new URL(source);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        throw new Error('AI returned an invalid grounding source URL.');
      }
    }
  }
  return value;
}

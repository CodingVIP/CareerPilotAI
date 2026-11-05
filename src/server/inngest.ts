import { Inngest } from 'inngest';
import { applySyncOperation, ensureUser, updateAiJob, SyncOperationInput } from './db/repository';
import { createAIProvider } from '../../aiProvider';
import { validateAtsResult, validateInterviewResult, validateScrapeResult } from './aiValidation';

export const inngest = new Inngest({ id: 'careerpilot-ai' });

export function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

export type AiJobKind = 'scrape' | 'ats' | 'interview';

export interface AiJobEventData {
  userId: string;
  jobId: string;
  kind: AiJobKind;
  payload: Record<string, unknown>;
}

const ai = createAIProvider();
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain JSON.');
  return JSON.parse(match[1] || match[0]);
}

async function executeAiJob(data: AiJobEventData): Promise<Record<string, unknown>> {
  const payload = data.payload;
  let prompt: string;
  if (data.kind === 'scrape') {
    prompt = `Extract a job posting into JSON from this source. Use exactly one jobType: remote, hybrid, or onsite.
URL: ${typeof payload.url === 'string' ? payload.url : 'not provided'}
TEXT:
${typeof payload.rawText === 'string' ? payload.rawText.slice(0, 12000) : 'No posting text was provided.'}
Return company, role, location, jobType, requirements (string array), description, salaryMin, salaryMax, salaryCurrency, and rawDescription.`;
  } else if (data.kind === 'ats') {
    prompt = `Analyze this resume against this job posting and return JSON with score (0-100), matchedKeywords (strings), missingKeywords (objects with keyword, importance high|medium|low, category hard-skill|soft-skill|tool|certification, context), bulletSuggestions (objects with suggestedBullet, targetKeyword, rationale, optional originalBullet), strengths (strings), and tailoringAdvice.
JOB:
${JSON.stringify(payload).slice(0, 12000)}`;
  } else {
    prompt = `Create an interview preparation dossier as JSON with companyOverview, interviewStages (strings), pastCandidateExperiences (objects with source, summary, roleRelevance, optional difficulty and interviewFormat), technicalQuestions (objects with question, topic, sampleAnswer, optional importance), behavioralQuestions (objects with question, competency, starFramework containing situation, task, action, result), and tipsForCompany (strings). Do not claim verified sources; label synthesis as such.
INTERVIEW INPUT:
${JSON.stringify(payload).slice(0, 12000)}`;
  }
  const response = await ai.generateContent({
    model: AI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const parsed = extractJson(response.text || '');
  if (data.kind === 'scrape') return validateScrapeResult(parsed);
  if (data.kind === 'ats') return validateAtsResult(parsed);
  return validateInterviewResult(parsed);
}

export const processSyncOperations = inngest.createFunction(
  {
    id: 'process-cloud-sync-operations',
    retries: 3,
    triggers: [{ event: 'careerpilot/sync.requested' }],
  },
  async ({ event, step }) => {
    const userId = event.data.userId;
    const operations = event.data.operations as SyncOperationInput[];
    await ensureUser(userId);
    return step.run('apply sync operations', async () => {
      const results = [];
      for (const operation of operations) {
        results.push({ id: operation.id, status: await applySyncOperation(userId, operation) });
      }
      return results;
    });
  },
);

export const processAiJob = inngest.createFunction(
  {
    id: 'process-ai-job',
    retries: 3,
    triggers: [{ event: 'careerpilot/ai.requested' }],
  },
  async ({ event, step }) => {
    const data = event.data as AiJobEventData;
    await updateAiJob(data.userId, data.jobId, { status: 'processing' });
    try {
      return await step.run('execute AI job', async () => {
        const result = await executeAiJob(data);
        await updateAiJob(data.userId, data.jobId, {
          status: 'completed',
          result: { ...result, generatedAt: new Date().toISOString() },
        });
        return { jobId: data.jobId, userId: data.userId, kind: data.kind, completed: true };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI job failed.';
      await updateAiJob(data.userId, data.jobId, { status: 'failed', error: message });
      throw error;
    }
  },
);

export const inngestFunctions = [processSyncOperations, processAiJob];

import { Inngest } from 'inngest';
import { applySyncOperation, ensureUser, updateAiJob, SyncOperationInput } from './db/repository';

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
    return step.run('accept AI job', async () => {
      await updateAiJob(data.userId, data.jobId, { status: 'completed', result: null });
      return { jobId: data.jobId, userId: data.userId, kind: data.kind, completed: true };
    });
  },
);

export const inngestFunctions = [processSyncOperations, processAiJob];

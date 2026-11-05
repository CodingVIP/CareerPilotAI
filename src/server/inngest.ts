import { Inngest } from 'inngest';
import { applySyncOperation, ensureUser, SyncOperationInput } from './db/repository';

export const inngest = new Inngest({ id: 'careerpilot-ai' });

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

export const inngestFunctions = [processSyncOperations];

import { getAuthHeaders } from './auth';

export interface PendingSyncOperation {
  id: string;
  entityType: 'application' | 'profile' | 'privacy';
  entityId: string;
  operation: 'upsert' | 'delete';
  baseUpdatedAt?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'conflict';
}

const QUEUE_KEY = 'careerpilot_sync_queue_v1';

function readQueue(): PendingSyncOperation[] {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSyncOperation[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const syncService = {
  enqueue(operation: Omit<PendingSyncOperation, 'createdAt' | 'status'>): void {
    const queue = readQueue();
    if (!queue.some((item) => item.id === operation.id)) {
      queue.push({ ...operation, createdAt: new Date().toISOString(), status: 'pending' });
      writeQueue(queue);
    }
  },

  getPending(): PendingSyncOperation[] {
    return readQueue().filter((operation) => operation.status === 'pending');
  },

  getConflicts(): PendingSyncOperation[] {
    return readQueue().filter((operation) => operation.status === 'conflict');
  },

  async flush(): Promise<{ applied: number; conflicts: number }> {
    const pending = this.getPending();
    if (!pending.length) return { applied: 0, conflicts: 0 };
    const response = await fetch('/api/sync/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ operations: pending }),
    });
    const body = (await response.json()) as {
      results?: Array<{ id: string; status: 'applied' | 'duplicate' | 'conflict' }>;
      error?: string;
    };
    if (!response.ok || !body.results) throw new Error(body.error || 'Unable to synchronize offline changes.');

    const resultMap = new Map(body.results.map((result) => [result.id, result.status]));
    const queue = readQueue().flatMap((operation) => {
      const status = resultMap.get(operation.id);
      if (status === 'conflict') return [{ ...operation, status: 'conflict' as const }];
      if (status === 'applied' || status === 'duplicate') return [];
      return [operation];
    });
    writeQueue(queue);
    return {
      applied: body.results.filter((result) => result.status !== 'conflict').length,
      conflicts: body.results.filter((result) => result.status === 'conflict').length,
    };
  },
};

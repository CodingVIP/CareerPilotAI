import { getAuthHeaders } from './auth';

export interface PendingSyncOperation {
  id: string;
  entityType: 'application' | 'profile' | 'resume' | 'privacy' | 'atsResult' | 'interviewDossier';
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

function updateOperation(id: string, update: Partial<PendingSyncOperation>): void {
  writeQueue(readQueue().map((operation) => (operation.id === id ? { ...operation, ...update } : operation)));
}

export const syncService = {
  enqueueUpsert(
    entityType: PendingSyncOperation['entityType'],
    entityId: string,
    payload: Record<string, unknown>,
    baseUpdatedAt?: string,
  ): void {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.enqueue({ id, entityType, entityId, operation: 'upsert', payload, baseUpdatedAt });
  },

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

  retryConflict(id: string): void {
    updateOperation(id, { status: 'pending' });
  },

  discard(id: string): void {
    writeQueue(readQueue().filter((operation) => operation.id !== id));
  },

  async flush(): Promise<{ applied: number; conflicts: number }> {
    const pending = this.getPending();
    if (!pending.length) return { applied: 0, conflicts: 0 };
    let applied = 0;
    let conflicts = 0;
    for (let index = 0; index < pending.length; index += 50) {
      const batch = pending.slice(index, index + 50);
      const response = await fetch('/api/sync/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ operations: batch }),
      });
      const body = (await response.json()) as {
        results?: Array<{ id: string; status: 'applied' | 'duplicate' | 'conflict' }>;
        error?: string;
      };
      if (!response.ok || !body.results) {
        throw new Error(body.error || 'Unable to synchronize offline changes.');
      }

      const resultMap = new Map(body.results.map((result) => [result.id, result.status]));
      writeQueue(readQueue().flatMap((operation) => {
        const status = resultMap.get(operation.id);
        if (status === 'conflict') return [{ ...operation, status: 'conflict' as const }];
        if (status === 'applied' || status === 'duplicate') return [];
        return [operation];
      }));
      applied += body.results.filter((result) => result.status !== 'conflict').length;
      conflicts += body.results.filter((result) => result.status === 'conflict').length;
    }
    return {
      applied,
      conflicts,
    };
  },
};

import assert from 'node:assert/strict';
import test from 'node:test';
import { syncService } from '../src/services/sync';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

test('deduplicates queued operations and removes applied results', async () => {
  syncService.enqueue({
    id: 'op-applied',
    entityType: 'application',
    entityId: 'app-1',
    operation: 'upsert',
    payload: { company: 'Acme' },
  });
  syncService.enqueue({
    id: 'op-applied',
    entityType: 'application',
    entityId: 'app-1',
    operation: 'upsert',
    payload: { company: 'Changed' },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    results: [{ id: 'op-applied', status: 'applied' }],
  }), { status: 200 });
  try {
    assert.equal(syncService.getPending().length, 1);
    assert.deepEqual(await syncService.flush(), { applied: 1, conflicts: 0 });
    assert.equal(syncService.getPending().length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('retains conflicts and supports retry and discard', async () => {
  syncService.enqueue({
    id: 'op-conflict',
    entityType: 'profile',
    entityId: 'profile-1',
    operation: 'upsert',
    payload: { name: 'Candidate' },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    results: [{ id: 'op-conflict', status: 'conflict' }],
  }), { status: 200 });
  try {
    assert.deepEqual(await syncService.flush(), { applied: 0, conflicts: 1 });
    assert.equal(syncService.getConflicts().length, 1);
    syncService.retryConflict('op-conflict');
    assert.equal(syncService.getPending().length, 1);
    syncService.discard('op-conflict');
    assert.equal(syncService.getPending().length, 0);
    assert.equal(syncService.getConflicts().length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('preserves queued changes when synchronization fails', async () => {
  syncService.enqueue({
    id: 'op-failed',
    entityType: 'privacy',
    entityId: 'current',
    operation: 'upsert',
    payload: { cloudSyncEnabled: true },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 });
  try {
    await assert.rejects(() => syncService.flush(), /Unavailable/);
    assert.equal(syncService.getPending().length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

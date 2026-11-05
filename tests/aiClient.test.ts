import assert from 'node:assert/strict';
import test from 'node:test';
import { apiService } from '../src/services/aiClient';

test('queues an AI job through the typed client', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, 'POST');
    assert.match(String(init?.body), /"kind":"ats"/);
    return new Response(JSON.stringify({ success: true, jobId: 'job-1', kind: 'ats' }), { status: 202 });
  };
  try {
    assert.deepEqual(await apiService.enqueueAiJob('ats', { applicationId: 'app-1' }), {
      success: true,
      jobId: 'job-1',
      kind: 'ats',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('surfaces queued AI job errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Background processing is unavailable.' }), { status: 503 });
  try {
    await assert.rejects(
      () => apiService.enqueueAiJob('scrape', { url: 'https://example.com' }),
      /Background processing is unavailable/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

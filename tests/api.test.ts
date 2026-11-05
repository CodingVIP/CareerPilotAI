import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import app from '../server';

test('health endpoint reports safe capability flags', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(typeof response.body.databaseConfigured, 'boolean');
  assert.equal(typeof response.body.authConfigured, 'boolean');
  assert.equal(typeof response.body.distributedRateLimitingConfigured, 'boolean');
});

test('sync endpoint rejects malformed batches', async () => {
  const response = await request(app).post('/api/sync/operations').send({ operations: [] });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /between 1 and 50/i);
});

test('sync endpoint rejects invalid operation shapes', async () => {
  const response = await request(app)
    .post('/api/sync/operations')
    .send({ operations: [{ id: 'op-1', entityId: 'app-1', entityType: 'unknown', operation: 'upsert', payload: {} }] });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Invalid sync operation.');
});

test('document parser rejects missing upload data', async () => {
  const response = await request(app).post('/api/documents/parse').send({});
  assert.equal(response.status, 400);
  assert.match(response.body.error, /document file data/i);
});

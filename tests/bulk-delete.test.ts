import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteSelected, type DeleteItem} from '../lib/bulk-delete';
import {deleteDocument} from '../lib/delete-document';
import {DELETE} from '../app/api/documents/[id]/route';
import {sign} from '../lib/auth';
import type {database, transaction} from '../lib/database';

const items: DeleteItem[] = Array.from({length: 3}, (_, i) => ({id: 'id-' + i, number: 'VB/' + i, title: 'Văn bản ' + i, updated: '2026-10-05T12:00:00Z', file_key: 'file-' + i}));
const requestMock = (fn: (url: string, init?: RequestInit) => Promise<Response>) => fn as typeof fetch;

test('bulk deletion sends exact selected IDs and versions; reports partial success and Drive warnings', async () => {
  const urls: string[] = [], progress: number[] = [];
  const report = await deleteSelected(items, {request: requestMock(async (url, init) => {
    urls.push(url);
    assert.equal(init?.method, 'DELETE');
    assert.equal(decodeURIComponent(new Headers(init?.headers).get('X-Document-Version')!), items[0].updated);
    if (url.endsWith('0')) return Response.json({ok: true, warning: 'Drive cleanup failed'});
    if (url.endsWith('1')) return Response.json({error: 'Changed'}, {status: 409});
    return Response.json({ok: true});
  }), onProgress: n => progress.push(n)});
  assert.deepEqual(urls, items.map(item => '/api/documents/' + item.id));
  assert.deepEqual(report.map(item => item.outcome), ['deleted', 'failed', 'deleted']);
  assert.equal(report[0].message, 'Drive cleanup failed');
  assert.deepEqual(progress, [1, 2, 3]);
});

test('expired session stops remaining deletes, without automatic retries', async () => {
  let calls = 0;
  const report = await deleteSelected(items, {request: requestMock(async () => {
    calls++; return Response.json({error: 'Please sign in'}, {status: 401});
  })});
  assert.equal(calls, 1);
  assert.deepEqual(report.map(item => item.outcome), ['failed', 'skipped', 'skipped']);
});

test('lost or malformed response leaves outcome unknown and stops; missing records are distinct', async () => {
  for (const response of ['lost', 'html', 'server'] as const) {
    let calls = 0;
    const report = await deleteSelected(items, {request: requestMock(async () => {
      calls++;
      if (calls === 1) return Response.json({error: 'Missing'}, {status: 404});
      if (response === 'lost') throw new TypeError('network');
      if (response === 'html') return new Response('<html>Error</html>');
      return Response.json({error: 'Server error'}, {status: 503});
    })});
    assert.equal(calls, 2);
    assert.deepEqual(report.map(item => item.outcome), ['missing', 'unknown', 'skipped']);
  }
});

test('stop waits for current operation and leaves remaining items untouched', async () => {
  let stopped = false, calls = 0;
  const report = await deleteSelected(items, {shouldStop: () => stopped, request: requestMock(async () => {
    calls++; stopped = true; return Response.json({ok: true});
  })});
  assert.equal(calls, 1);
  assert.deepEqual(report.map(item => item.outcome), ['deleted', 'skipped', 'skipped']);
});

test('rejects empty, duplicate and over-limit batches before making any requests', async () => {
  const request = requestMock(async () => {assert.fail('Must not send a request')});
  for (const batch of [[], [items[0], items[0]], Array.from({length: 101}, (_, i) => ({...items[0], id: String(i)}))]) {
    await assert.rejects(deleteSelected(batch, {request}));
  }
});

function fixture(row: {updated: string; file_key: string | null} | undefined, failCommit = false, failTrash = false) {
  const calls: string[] = [];
  const db = {prepare(sql: string) {
    assert.ok(sql.endsWith('FOR UPDATE') || sql.startsWith('DELETE'));
    return {bind(id: unknown) {
      assert.equal(id, 'id-0');
      return {first: async () => {calls.push('lock'); return row}, run: async () => {calls.push('delete')}};
    }};
  }} as unknown as ReturnType<typeof database>;
  const transact = (async (fn: (db: ReturnType<typeof database>) => Promise<unknown>) => {
    calls.push('begin'); const result = await fn(db);
    if (failCommit) throw new Error('commit failed');
    calls.push('commit'); return result;
  }) as typeof transaction;
  return {calls, deps: {transaction: transact, trash: async (id: string) => {
    assert.equal(id, 'file-0'); assert.equal(calls.at(-1), 'commit'); calls.push('trash');
    if (failTrash) throw new Error('Drive unavailable');
  }}};
}

test('deletion locks the record and checks its version; missing or changed records never trash files', async () => {
  for (const [row, status] of [[undefined, 404], [{updated: 'new-version', file_key: 'file-0'}, 409]] as const) {
    const f = fixture(row);
    assert.equal((await deleteDocument('id-0', 'old-version', f.deps)).status, status);
    assert.deepEqual(f.calls, ['begin', 'lock', 'commit']);
  }
});

test('Drive cleanup happens only after commit, and failure is returned as a warning', async () => {
  const f = fixture({updated: 'v1', file_key: 'file-0'}, false, true);
  const response = await deleteDocument('id-0', 'v1', f.deps);
  const data = await response.json();
  assert.equal(data.ok, true); assert.ok(data.warning);
  assert.deepEqual(f.calls, ['begin', 'lock', 'delete', 'commit', 'trash']);
  const failed = fixture({updated: 'v1', file_key: 'file-0'}, true);
  await assert.rejects(deleteDocument('id-0', 'v1', failed.deps));
  assert.ok(!failed.calls.includes('trash'));
  const noFile = fixture({updated: 'v1', file_key: null});
  assert.equal((await deleteDocument('id-0', 'v1', noFile.deps)).status, 200);
  assert.ok(!noFile.calls.includes('trash'));
});

test('DELETE endpoint rejects public, cross-origin and malformed-version requests before database work', async () => {
  process.env.APP_SECRET = 'test-only-secret-not-for-production-123456';
  process.env.APP_URL = 'https://office.example';
  process.env.PUBLIC_READ = 'true';
  const params = Promise.resolve({id: 'id-0'});
  assert.equal((await DELETE(new Request('https://office.example/api/documents/id-0', {method: 'DELETE'}), {params})).status, 401);
  const cookie = 'office_admin=' + sign({role: 'admin'}, 60);
  assert.equal((await DELETE(new Request('https://office.example/api/documents/id-0', {method: 'DELETE', headers: {cookie, origin: 'https://other.example'}}), {params})).status, 403);
  assert.equal((await DELETE(new Request('https://office.example/api/documents/id-0', {method: 'DELETE', headers: {cookie, origin: 'https://office.example', 'X-Document-Version': '%bad'}}), {params})).status, 400);
});

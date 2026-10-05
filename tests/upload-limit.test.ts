import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {MAX_UPLOAD_BYTES, isAllowedUploadSize} from '../lib/upload-limits';
import {uploadAttachment} from '../lib/upload-client';
import {splitZipParts} from '../lib/zip-export';
import {POST} from '../app/api/uploads/route';
import {seal, sign} from '../lib/auth';

test('100 MB boundary accepts valid sizes and rejects empty, oversized or malformed sizes', () => {
  assert.equal(MAX_UPLOAD_BYTES, 104857600);
  for (const size of [1, 10 * 1024 * 1024 + 1, MAX_UPLOAD_BYTES]) assert.ok(isAllowedUploadSize(size));
  for (const size of [0, -1, MAX_UPLOAD_BYTES + 1, 1.5, NaN, Infinity, '104857600', null]) assert.equal(isAllowedUploadSize(size), false);
});

test('100 MB upload sends 100 chunks directly to Drive; Vercel receives metadata only', async t => {
  const ranges: string[] = [], progress: number[] = [];
  const file = {name: 'large.pdf', size: MAX_UPLOAD_BYTES, slice: (start: number, end: number) => {
    assert.equal(start, ranges.length * 1024 * 1024);
    assert.ok(end - start <= 1024 * 1024);
    return new Blob([new Uint8Array(end - start)]);
  }} as File;
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url === '/api/uploads') {
      assert.equal(typeof init.body, 'string');
      assert.deepEqual(JSON.parse(init.body as string), {documentId: 'doc-100', name: file.name, size: MAX_UPLOAD_BYTES});
      return Response.json({uploadId: 'upload-100', sessionUrl: 'https://www.googleapis.com/test-session'});
    }
    assert.equal(url, 'https://www.googleapis.com/test-session');
    const range = new Headers(init.headers).get('Content-Range')!;
    const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range)!;
    assert.ok(match);
    assert.equal(Number(match[3]), MAX_UPLOAD_BYTES);
    assert.equal(Number(match[1]), ranges.length * 1024 * 1024);
    assert.equal((init.body as Blob).size, Number(match[2]) - Number(match[1]) + 1);
    ranges.push(range);
    return ranges.length === 100 ? Response.json({id: 'file-100'})
      : new Response(null, {status: 308, headers: {Range: 'bytes=0-' + match[2]}});
  });
  assert.equal(await uploadAttachment(file, 'doc-100', n => progress.push(n)), 'upload-100');
  assert.equal(ranges.length, 100);
  assert.equal(progress.at(-1), 100);
});

test('oversized and empty files are rejected before an upload session is created', async t => {
  t.mock.method(globalThis, 'fetch', async () => {assert.fail('No network request allowed')});
  for (const size of [0, MAX_UPLOAD_BYTES + 1]) {
    await assert.rejects(uploadAttachment({name: 'bad.pdf', size} as File, 'doc', () => {}), /100 MB/);
  }
});

test('upload API rejects oversized metadata even when frontend checks are bypassed', async () => {
  process.env.APP_SECRET = 'test-only-secret-not-for-production-123456';
  process.env.APP_URL = 'https://office.example';
  const cookie = 'office_admin=' + sign({role: 'admin'}, 60);
  for (const size of [0, MAX_UPLOAD_BYTES + 1]) {
    const response = await POST(new Request('https://office.example/api/uploads', {
      method: 'POST', headers: {cookie, origin: 'https://office.example', 'Content-Type': 'application/json'},
      body: JSON.stringify({documentId: 'doc', name: 'large.pdf', size}),
    }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /100 MB/);
  }
});

test('a 100 MB attachment gets its own ZIP part without omitting smaller files', () => {
  const parts = splitZipParts([
    {id: 'a', file_size: 1, updated: ''},
    {id: 'b', file_size: MAX_UPLOAD_BYTES, updated: ''},
    {id: 'c', file_size: 1, updated: ''},
  ]);
  assert.deepEqual(parts.map(part => part.items.map(item => item.id)), [['a'], ['b'], ['c']]);
});

test('PostgreSQL schema upgrade and upload API support 100 MB', {skip: !process.env.TEST_DATABASE_URL}, async t => {
  // Only use the dedicated disposable CI database, never DATABASE_URL from a deployment.
  const pool = new Pool({connectionString: process.env.TEST_DATABASE_URL, ssl: false});
  try {
    await pool.query('CREATE ROLE anon; CREATE ROLE authenticated;');
    await pool.query(await readFile(new URL('../supabase/migrations/001_initial.sql', import.meta.url), 'utf8'));
    const insert = (id: string, size: number) => pool.query(
      'INSERT INTO pending_uploads(id,document_id,drive_id,file_name,file_size) VALUES ($1,$1,$1,$2,$3)',
      [id, 'large.pdf', size]);
    await t.test('fresh schema accepts 100 MB but rejects 100 MB plus one byte', async () => {
      await insert('at-limit', MAX_UPLOAD_BYTES);
      await assert.rejects(insert('over-limit', MAX_UPLOAD_BYTES + 1), {code: '23514'});
      await pool.query("DELETE FROM pending_uploads WHERE id='at-limit'");
    });
    await t.test('legacy 10 MB constraint is upgraded repeatably while existing rows survive', async () => {
      await pool.query('ALTER TABLE pending_uploads DROP CONSTRAINT pending_uploads_file_size_check; ALTER TABLE pending_uploads ADD CONSTRAINT pending_uploads_file_size_check CHECK(file_size BETWEEN 1 AND 10485760)');
      await insert('existing', 5 * 1024 * 1024);
      await assert.rejects(insert('before-upgrade', MAX_UPLOAD_BYTES), {code: '23514'});
      const sql = await readFile(new URL('../supabase/migrations/002_upload_limit_100mb.sql', import.meta.url), 'utf8');
      await pool.query(sql);
      await pool.query(sql);
      assert.equal((await pool.query("SELECT file_size FROM pending_uploads WHERE id='existing'")).rows[0].file_size, 5 * 1024 * 1024);
      await insert('after-upgrade', MAX_UPLOAD_BYTES);
      await assert.rejects(insert('still-too-large', MAX_UPLOAD_BYTES + 1), {code: '23514'});
    });
    await t.test('authenticated API creates a 100 MB pending upload and correctly declares its size to Drive', async st => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      process.env.DATABASE_SSL = 'false';
      process.env.APP_URL = 'https://office.example';
      process.env.APP_SECRET = 'test-only-secret-not-for-production-123456';
      await pool.query("INSERT INTO app_settings(key,value) VALUES ('drive',$1)", [
        seal(JSON.stringify({refreshToken: 'test-token', folderId: 'test-folder', email: 'test@example.com'})),
      ]);
      const seen: string[] = [];
      st.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
        seen.push(url);
        if (url === 'https://oauth2.googleapis.com/token') return Response.json({access_token: 'test-access'});
        if (url.includes('generateIds')) return Response.json({ids: ['drive-100']});
        assert.ok(url.includes('uploadType=resumable'));
        assert.equal(new Headers(init?.headers).get('X-Upload-Content-Length'), String(MAX_UPLOAD_BYTES));
        return new Response(null, {status: 200, headers: {location: 'https://www.googleapis.com/test-session'}});
      });
      const response = await POST(new Request('https://office.example/api/uploads', {
        method: 'POST',
        headers: {cookie: 'office_admin=' + sign({role: 'admin'}, 60), origin: 'https://office.example', 'Content-Type': 'application/json'},
        body: JSON.stringify({documentId: 'doc-100', name: 'large.pdf', size: MAX_UPLOAD_BYTES}),
      }));
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.sessionUrl, 'https://www.googleapis.com/test-session');
      assert.equal((await pool.query('SELECT file_size FROM pending_uploads WHERE id=$1', [data.uploadId])).rows[0].file_size, MAX_UPLOAD_BYTES);
      assert.equal(seen.length, 3);
      const {connection} = await import('../lib/database');
      await connection().end();
    });
  } finally {await pool.end()}
});

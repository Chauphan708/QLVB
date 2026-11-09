import test from 'node:test';
import assert from 'node:assert/strict';
import {dueInfo, isPreviewable, formatBytes, today, type Doc} from '../lib/documents';
import {suggestNextNumber} from '../lib/number-helper';
import {documentQuery, FilterError} from '../lib/document-query';

const sampleDoc = (overrides: Partial<Doc> = {}): Doc => ({
  id: 'test-1',
  direction: 'in',
  number: '01/CV-TH',
  title: 'Công văn mẫu',
  organization: 'Phòng GD&ĐT',
  issuing_body: 'Phòng GD&ĐT',
  issued: today(),
  received: today(),
  category: 'Công văn',
  assignee: 'Thầy An',
  due: '',
  urgency: 'normal',
  status: 'new',
  notes: '',
  expires_on: '',
  replaced_by: '',
  file_name: 'van-ban.pdf',
  file_size: 1024 * 500,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  ...overrides,
});

test('dueInfo accurately calculates relative deadlines and badges', () => {
  assert.equal(dueInfo(sampleDoc({status: 'done', due: '2026-01-01'})).className, 'done');
  assert.equal(dueInfo(sampleDoc({due: ''})).className, 'none');

  const t = today();
  assert.equal(dueInfo(sampleDoc({due: t})).text, 'Hôm nay đến hạn');
  assert.equal(dueInfo(sampleDoc({due: t})).className, 'today');

  // Past date
  const past = '2026-01-01';
  const pastInfo = dueInfo(sampleDoc({due: past}));
  assert.equal(pastInfo.className, 'late');
  assert.match(pastInfo.text, /Quá hạn/);

  // Future date: 10 days ahead
  const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const futureStr = futureDate.toISOString().slice(0, 10);
  const futureInfo = dueInfo(sampleDoc({due: futureStr}));
  assert.equal(futureInfo.className, 'upcoming');
  assert.match(futureInfo.text, /Còn \d+ ngày/);
});

test('isPreviewable identifies supported web preview formats and rejects others', () => {
  assert.ok(isPreviewable('file.pdf'));
  assert.ok(isPreviewable('image.PNG'));
  assert.ok(isPreviewable('photo.jpg'));
  assert.ok(isPreviewable('graphic.jpeg'));
  assert.ok(isPreviewable('modern.webp'));
  assert.ok(isPreviewable('animation.gif'));

  assert.equal(isPreviewable('document.docx'), false);
  assert.equal(isPreviewable('spreadsheet.xlsx'), false);
  assert.equal(isPreviewable('archive.zip'), false);
  assert.equal(isPreviewable(''), false);
  assert.equal(isPreviewable(null), false);
  assert.equal(isPreviewable(undefined), false);
});

test('formatBytes formats file sizes readably', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
  assert.equal(formatBytes(100 * 1024 * 1024), '100.0 MB');
});

test('suggestNextNumber detects max number in category and year, incrementing appropriately', () => {
  const currentYear = new Date().getFullYear();
  const docs: Doc[] = [
    sampleDoc({number: `05/CV-TH`, issued: `${currentYear}-01-10`, category: 'Công văn', direction: 'out'}),
    sampleDoc({number: `12/CV-TH`, issued: `${currentYear}-03-15`, category: 'Công văn', direction: 'out'}),
    sampleDoc({number: `02/QĐ-TH`, issued: `${currentYear}-02-01`, category: 'Quyết định', direction: 'out'}),
  ];

  // For category 'Công văn', should detect max 12 and suggest 13/CV-TH
  const nextCV = suggestNextNumber(docs, 'out', 'Công văn');
  assert.equal(nextCV, '13/CV-TH');

  // For category 'Quyết định', should detect max 2 and suggest 03/QĐ-TH
  const nextQD = suggestNextNumber(docs, 'out', 'Quyết định');
  assert.equal(nextQD, '03/QĐ-TH');

  // For category 'Kế hoạch' (none existing yet), should suggest 01/KH-TH
  const nextKH = suggestNextNumber(docs, 'out', 'Kế hoạch');
  assert.equal(nextKH, '01/KH-TH');
});

test('documentQuery safely filters by assignee and rejects invalid parameters', () => {
  const qAll = documentQuery(new URL('https://x/?assignee=all'));
  assert.ok(!qAll.args.includes('all'));

  const qNamed = documentQuery(new URL('https://x/?assignee=Th%E1%BA%A7y%20An'));
  assert.ok(qNamed.args.includes('Thầy An'));

  // Rejects excessively long assignee (> 200 chars)
  assert.throws(
    () => documentQuery(new URL('https://x/?assignee=' + 'A'.repeat(250))),
    FilterError
  );
});

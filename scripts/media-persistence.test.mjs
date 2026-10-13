import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('services/dbService.ts', 'utf8');
function service(uploadError = null) {
  const calls = [];
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'owner' } } } }) },
    storage: { from: () => ({
      upload: async (path, blob, options) => { calls.push({ path, blob, options }); return { error: uploadError }; },
      getPublicUrl: path => ({ data: { publicUrl: `https://example.test/${path}` } }),
    }) },
    from: table => ({ insert: async row => { calls.push({ table, row }); return { error: null }; } }),
  };
  const api = {};
  new Function('require', 'exports', ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(name => name.includes('supabaseClient') ? { supabase } : {}, api);
  return { api, calls };
}

test('storage preserves PNG bytes and MIME without overwriting an existing object', async () => {
  const { api, calls } = service();
  assert.equal(await api.uploadImage('data:image/png;base64,YWJj', 'owner/photo'), 'https://example.test/owner/photo');
  assert.equal(await calls[0].blob.text(), 'abc');
  assert.deepEqual(calls[0].options, { contentType: 'image/png', upsert: false });
});

test('failed image uploads cannot fall back to large inline database writes', async () => {
  const { api, calls } = service(new Error('Storage unavailable'));
  await assert.rejects(api.saveAppJournalEntry('plant', { image: 'data:image/png;base64,YWJj' }), /Photo upload failed/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].row, undefined);
});

test('legacy camera callers can still upload bare JPEG base64', async () => {
  const { api, calls } = service();
  assert.equal(await api.uploadImage('YWJj', 'owner/legacy'), 'https://example.test/owner/legacy');
  assert.equal(calls[0].options.contentType, 'image/jpeg');
  assert.equal(await calls[0].blob.text(), 'abc');
});

test('secondary report preserves the existing media URL and report data', async () => {
  const { api, calls } = service();
  const diagnosisData = { summary: 'Saved observation', confidence: 0 };
  assert.equal(await api.saveDiagnosisReport('plant', { imageUri: 'https://example.test/owner/photo', diagnosisData }), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].row.image_url, 'https://example.test/owner/photo');
  assert.deepEqual(calls[0].row.diagnosis_json, diagnosisData);
  assert.equal(calls[0].row.confidence_score, 0);
});

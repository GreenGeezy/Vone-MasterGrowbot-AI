import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/gemini-v3/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function handler(items, status = 200) {
  let serve, lookups = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'verified-jwt-subject' } } }) } };
  new Function('require', 'exports', 'Deno', 'fetch', compiled)(
    name => name.includes('supabase') ? { createClient: () => client } : { RequestValidationError: class extends Error {} }, {},
    { env: { get: () => 'test-only' }, serve: fn => { serve = fn; } },
    async url => {
      lookups++;
      assert.match(url, /customers\/verified-jwt-subject\/active_entitlements$/);
      return new Response(JSON.stringify({ items }), { status });
    },
  );
  return { run: () => serve(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ mode: 'premium_access', appUserId: 'forged-id', isPremium: true }) })), calls: () => lookups };
}
test('preflight uses verified JWT subject, allows active Premium without inference or quota calls', async () => {
  const h = handler([{ entitlement_id: 'entl05530ace9d', expires_at: Date.now() + 60000 }]);
  const response = await h.run();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { premium: true }); assert.equal(h.calls(), 1);
});
test('preflight denies absent, expired and Pro-only entitlements', async () => {
  for (const items of [[], [{ entitlement_id: 'entl05530ace9d', expires_at: 1 }], [{ entitlement_id: 'pro', expires_at: null }]]) {
    const response = await handler(items).run();
    assert.equal(response.status, 403); assert.equal((await response.json()).code, 'premium_required');
  }
});
test('RevenueCat outage remains verification unavailable, not a purchase requirement', async () => {
  const response = await handler([], 503).run();
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'premium_verification_unavailable');
});
test('client preserves structured access rejection and distinguishes service failure', async () => {
  const source = await readFile(new URL('../services/videoAnalysisService.ts', import.meta.url), 'utf8');
  const exports = {}; let code = 'premium_required';
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(
    name => name.includes('edgeRequest') ? { requestEdge: async () => { throw { context: new Response(JSON.stringify({ error: 'Denied', code }), { status: 403 }) }; } } : {}, exports);
  assert.equal(await exports.checkVideoAccess(), false);
  code = 'premium_verification_unavailable';
  await assert.rejects(exports.checkVideoAccess(), error => error.code === code);
});

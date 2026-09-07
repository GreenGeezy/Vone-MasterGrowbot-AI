import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../services/authSession.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createSessionInitializer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('a refresh failure never creates a replacement anonymous identity', async () => {
  let signIns = 0;
  const initialize = createSessionInitializer({
    getSession: async () => ({ data: { session: null }, error: new Error('refresh unavailable') }),
    signInAnonymously: async () => { signIns++; },
  });
  await assert.rejects(initialize(), /refresh unavailable/);
  assert.equal(signIns, 0);
});

test('concurrent callers share a pending sign-in, including callers retrying while it is slow', async () => {
  let finish;
  let signIns = 0;
  const session = { user: { id: 'original-user' }, access_token: 'first' };
  const initialize = createSessionInitializer({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: () => { signIns++; return new Promise(resolve => { finish = resolve; }); },
  });
  const first = initialize();
  await Promise.resolve();
  const retry = initialize();
  assert.equal(first, retry);
  finish({ data: { session }, error: null });
  assert.equal(await first, session);
  assert.equal(signIns, 1);
});

test('later calls read refreshed tokens instead of retaining the startup session', async () => {
  let token = 'first';
  const initialize = createSessionInitializer({
    getSession: async () => ({ data: { session: { user: { id: 'same-user' }, access_token: token } } }),
    signInAnonymously: async () => { throw new Error('must not sign in'); },
  });
  assert.equal((await initialize()).access_token, 'first');
  token = 'refreshed';
  assert.equal((await initialize()).access_token, 'refreshed');
});

test('a transient failure can recover on retry with the original identity', async () => {
  let failed = true;
  const initialize = createSessionInitializer({
    getSession: async () => failed ? { error: new Error('offline') } : { data: { session: { user: { id: 'original-user' } } } },
    signInAnonymously: async () => { throw new Error('must not replace identity'); },
  });
  await assert.rejects(initialize(), /offline/);
  failed = false;
  assert.equal((await initialize()).user.id, 'original-user');
});

test('an SDK-cleared session on an existing installation cannot silently become a new identity', async () => {
  let signIns = 0;
  const initialize = createSessionInitializer({
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => { signIns++; },
  }, { exists: () => true, remember: () => {} });
  await assert.rejects(initialize(), /refusing to replace/);
  await assert.rejects(initialize(), /refusing to replace/);
  assert.equal(signIns, 0);
});

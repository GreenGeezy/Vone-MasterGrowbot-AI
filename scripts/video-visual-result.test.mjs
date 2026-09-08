import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../services/videoVisualResult.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseVideoVisualResult: parse } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const result = {
  visualSummary: 'Several lower leaves appear yellow.', severity: 'uncertain', confidence: 45,
  visibleSigns: ['Yellowing at lower leaf edges.'], possibleInterpretations: ['Color cast may contribute.'],
  areasToInspect: ['Lower leaves'], environmentSummary: 'Purple lighting limits color assessment.',
  mediaQuality: 'The camera moves quickly.', recommendedVerification: 'Capture a stable close-up in neutral light.',
};
test('accepts structured observations and plain JSON', () => {
  assert.deepEqual(parse(result), result);
  assert.deepEqual(parse(JSON.stringify(result)), result);
});
test('excludes unrelated cultivation fields from projected results', () => {
  assert.deepEqual(parse({ ...result, harvestWindow: 'unexpected', nutrientTargets: { ec: 2 }, arbitrary: true }), result);
});
test('rejects missing required observations', () => {
  for (const key of Object.keys(result)) {
    const broken = { ...result }; delete broken[key]; assert.throws(() => parse(broken));
  }
});
test('rejects malformed JSON, primitives and oversized responses', () => {
  for (const value of [null, [], false, 3, '{}', '{broken', 'x'.repeat(16001), '```json\n{}\n```']) assert.throws(() => parse(value));
});
test('rejects invalid confidence instead of displaying false precision', () => {
  for (const confidence of [-1, 101, NaN, Infinity, '90', null]) assert.throws(() => parse({ ...result, confidence }));
});
test('rejects unknown severity', () => assert.throws(() => parse({ ...result, severity: 'certain' })));
test('rejects oversized, blank or unstructured observation lists', () => {
  for (const visibleSigns of ['yellow', [''], [null], Array(9).fill('spot'), ['x'.repeat(1501)]]) assert.throws(() => parse({ ...result, visibleSigns }));
});
test('allows no visible signs when other required assessments describe limitations', () => {
  assert.deepEqual(parse({ ...result, visibleSigns: [] }).visibleSigns, []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../services/planCopy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { planBenefit } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('annual comparison uses actual numeric price and preserves currency', () => {
  assert.match(planBenefit('annual', { price: 99.99, currencyCode: 'USD', priceString: '$99.99' }), /\$1\.92\/week/);
  assert.match(planBenefit('annual', { price: 199, currencyCode: 'USD', priceString: '$199.00' }), /\$3\.83\/week/);
});
test('missing store price suppresses the weekly equivalent', () => {
  assert.equal(planBenefit('annual', { priceString: '$99.99' }), 'Support your full grow cycle');
  assert.equal(planBenefit('weekly', { priceString: '$7.99' }), 'Try a focused check-in this week');
});

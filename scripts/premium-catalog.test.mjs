import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../services/premiumCatalog.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { PREMIUM_PRODUCTS: ids, preferredPremiumCadence: cadence, hasPremiumAccess, validatedPremiumPackages, annualSavingsPercent } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

for (const [id, expected] of Object.entries({
  weekly_pro_v2: 'weekly', mastergrowbot_pro_weekly_v3: 'weekly', 'com.mastergrowbot.ai.sub.weekly': 'weekly',
  monthly_pro_v2: 'monthly', 'com.mastergrowbot.ai.sub.monthly': 'monthly',
  yearly_pro_v2: 'annual', mastergrowbot_pro_yearly_v3: 'annual',
})) test(`maps active base/trial ${id}`, () => {
  assert.equal(cadence({ entitlements: { active: { pro: { productIdentifier: id } } } }), expected);
});
test('overlapping trial and upgrade prefer active Premium', () => {
  assert.equal(cadence({ entitlements: { active: { pro: { productIdentifier: 'weekly_pro_v2' }, machine_vision: { productIdentifier: ids.monthly } } } }), 'monthly');
});
test('unknown, lifetime and ambiguous cadences show every option', () => {
  for (const info of [null, { activeSubscriptions: ['unrecognized'] }, { activeSubscriptions: ['weekly_pro_v2', 'monthly_pro_v2'] }, { entitlements: { active: { pro: { productIdentifier: 'mastergrowbot_pro_lifetime' } } } }]) assert.equal(cadence(info), null);
});
test('active Premium entitlement is required, not merely subscription history', () => {
  assert.equal(hasPremiumAccess({ entitlements: { active: { machine_vision: {} } } }), true);
  assert.equal(hasPremiumAccess({ activeSubscriptions: [ids.weekly] }), false);
  assert.equal(hasPremiumAccess({ entitlements: { active: { pro: {} } } }), false);
  assert.equal(hasPremiumAccess(null), false);
});
test('only exactly associated packages are accepted', () => {
  const valid = Object.entries(ids).map(([identifier, id]) => ({ identifier, product: { identifier: id } }));
  assert.deepEqual(validatedPremiumPackages(valid), valid);
  assert.deepEqual(validatedPremiumPackages([{ identifier: 'weekly', product: { identifier: ids.monthly } }]), []);
  assert.deepEqual(validatedPremiumPackages([valid[0], valid[0]]), []);
  assert.deepEqual(validatedPremiumPackages([]), []);
});
test('intentional 199 yearly price yields 67 percent savings', () => {
  assert.equal(annualSavingsPercent({ identifier: ids.monthly, price: 49.99, currencyCode: 'USD' }, { identifier: ids.annual, price: 199, currencyCode: 'USD' }), 67);
});
test('missing numeric prices, mismatched currencies and invalid savings suppress badge', () => {
  const monthly = { identifier: ids.monthly, price: 49.99, currencyCode: 'USD' };
  for (const annual of [
    { identifier: ids.annual, priceString: '$199.00', currencyCode: 'USD' },
    { identifier: ids.annual, price: 199, currencyCode: 'EUR' },
    { identifier: ids.annual, price: NaN, currencyCode: 'USD' },
    { identifier: ids.annual, price: 999, currencyCode: 'USD' },
  ]) assert.equal(annualSavingsPercent(monthly, annual), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function moduleWithMocks(path, mocks = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
const catalog = await moduleWithMocks('../services/premiumCatalog.ts');
const status = await moduleWithMocks('../services/premiumPurchaseStatus.ts', { './premiumCatalog': catalog });
const empty = { entitlements: { active: {} }, activeSubscriptions: [] };
const premium = { entitlements: { active: { machine_vision: {} } } };

async function identityFixture() {
  const storage = new Map();
  let id = 'legacy-pro-user';
  const logins = [];
  const api = {
    getAppUserID: async () => ({ appUserID: id }),
    logIn: async ({ appUserID }) => { id = appUserID; logins.push(id); return { customerInfo: empty }; },
  };
  const identity = await moduleWithMocks('../services/revenueCatIdentity.ts', {
    '@capacitor/preferences': { Preferences: {
      get: async ({ key }) => ({ value: storage.get(key) || null }),
      set: async ({ key, value }) => { storage.set(key, value); },
      remove: async ({ key }) => { storage.delete(key); },
    } },
    './supabaseClient': { supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'authenticated-user' } } } }) } } },
    './premiumCatalog': catalog,
  });
  return { identity, api, storage, logins, id: () => id };
}

test('interrupted pre-purchase binding returns to legacy Pro identity', async () => {
  const f = await identityFixture();
  await f.identity.beginPremiumRevenueCatBinding(f.api);
  await f.identity.recoverPendingRevenueCatBinding(f.api, empty);
  assert.equal(f.id(), 'legacy-pro-user');
  assert.equal(f.storage.size, 1);
});
test('returned or pending Apple transaction survives restart on authenticated identity', async () => {
  const f = await identityFixture();
  await f.identity.beginPremiumRevenueCatBinding(f.api);
  await f.identity.markPremiumPurchasePending();
  await f.identity.recoverPendingRevenueCatBinding(f.api, empty);
  assert.equal(f.id(), 'authenticated-user');
  assert.equal(await f.identity.hasPendingPremiumPurchase(), true);
  assert.deepEqual(f.logins, ['authenticated-user']);
});
test('verified entitlement commits identity and removes recovery markers', async () => {
  const f = await identityFixture();
  await f.identity.beginPremiumRevenueCatBinding(f.api);
  await f.identity.markPremiumPurchasePending();
  await f.identity.completePremiumRevenueCatBinding(premium);
  assert.equal(await f.identity.hasPendingPremiumPurchase(), false);
  await f.identity.recoverPendingRevenueCatBinding(f.api, premium);
  assert.equal(f.id(), 'authenticated-user');
});
test('confirmed cancellation can restore the prior subscriber identity', async () => {
  const f = await identityFixture();
  const binding = await f.identity.beginPremiumRevenueCatBinding(f.api);
  await f.identity.markPremiumPurchasePending();
  await f.identity.rollbackPremiumRevenueCatBinding(f.api, binding);
  assert.equal(f.id(), 'legacy-pro-user');
  assert.equal(await f.identity.hasPendingPremiumPurchase(), false);
});
test('active product without entitlement never commits paid access', async () => {
  const f = await identityFixture();
  const info = { ...empty, activeSubscriptions: [catalog.PREMIUM_PRODUCTS.weekly] };
  await assert.rejects(f.identity.completePremiumRevenueCatBinding(info));
  assert.match(status.premiumStatusMessage(info), /subscription was found/);
  assert.equal(catalog.hasPremiumAccess(info), false);
});
test('stale customer cache refreshes until delayed entitlement arrives', async () => {
  let reads = 0, invalidations = 0;
  const info = await status.refreshPremiumCustomer({
    invalidateCustomerInfoCache: async () => { invalidations++; },
    getCustomerInfo: async () => ({ customerInfo: ++reads === 3 ? premium : empty }),
  }, empty, async () => {});
  assert.equal(info, premium);
  assert.equal(invalidations, 3);
});
test('missing entitlement stays locked after bounded retries; network failure propagates', async () => {
  let reads = 0;
  const api = { invalidateCustomerInfoCache: async () => {}, getCustomerInfo: async () => { reads++; return { customerInfo: empty }; } };
  assert.equal(await status.refreshPremiumCustomer(api, empty, async () => {}), empty);
  assert.equal(reads, 3);
  await assert.rejects(status.refreshPremiumCustomer({ ...api, getCustomerInfo: async () => { throw new Error('offline'); } }, empty), /offline/);
});
test('cancellation, pending approval, wrong account and offline messages differ', () => {
  assert.equal(status.isPurchaseCancelled({ code: 1 }), true);
  assert.equal(status.isPurchaseCancelled({ code: '20' }), false);
  assert.match(status.purchaseErrorMessage({ code: '20' }), /approval/);
  assert.match(status.purchaseErrorMessage({ code: '13' }), /another app account/);
  assert.match(status.purchaseErrorMessage({ code: '35' }), /connection/);
});

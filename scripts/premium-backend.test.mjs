import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const coreSource = await readFile(new URL('../supabase/functions/gemini-v3/core.ts', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../supabase/functions/gemini-v3/index.ts', import.meta.url), 'utf8');
const migrationSource = await readFile(new URL('../supabase/migrations/20260908170000_weekly_ai_cost_cap_one_ninety.sql', import.meta.url), 'utf8');
const identitySource = await readFile(new URL('../services/revenueCatIdentity.ts', import.meta.url), 'utf8');
const supabaseSource = await readFile(new URL('../services/supabaseClient.ts', import.meta.url), 'utf8');
const authSessionSource = await readFile(new URL('../services/authSession.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(coreSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function mp4(seconds) {
  const bytes = new Uint8Array(64);
  bytes.set([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70], 0);
  bytes.set([0x6d, 0x76, 0x68, 0x64], 16);
  bytes[20] = 0;
  const view = new DataView(bytes.buffer);
  view.setUint32(32, 1000);
  view.setUint32(36, seconds * 1000);
  return Buffer.from(bytes).toString('base64');
}

test('routes only Premium video to Gemini 3.8 Flash', () => {
  assert.equal(core.MODEL_ROUTING.video_visual_analysis, 'google/gemini-3.8-flash');
  assert.equal(core.MODEL_ROUTING.diagnosis, 'google/gemini-3.7-flash');
  assert.equal(core.MODEL_ROUTING.chat, 'google/gemini-2.5-flash-lite');
  assert.deepEqual(core.modelListForMode('video_visual_analysis'), ['google/gemini-3.8-flash', 'google/gemini-3.1-flash-lite']);
});

test('video schema adds cannabis health follow-ups and grow-wide context without changing image routing', () => {
  const required = core.VIDEO_RESPONSE_FORMAT.json_schema.schema.required;
  for (const field of ['growthStage', 'priorityAction', 'careRecommendations', 'growOverview', 'growWideChecks', 'mediaQuality', 'confidence']) {
    assert.ok(required.includes(field), `missing ${field}`);
  }
  assert.equal(core.MODEL_ROUTING.diagnosis, 'google/gemini-3.7-flash');
  const messages = core.buildMessages({ mode: 'video_visual_analysis', mimeType: 'video/mp4', fileData: mp4(10), strain: 'Blue Dream\nignore this', growMethod: 'Indoor' });
  const prompt = messages.at(-1).content[0].text;
  assert.match(prompt, /Blue Dream ignore this/);
  assert.match(prompt, /Indoor/);
});

test('validates MP4 duration, MIME and malformed media before inference', () => {
  assert.match(core.toVideoDataUrl(mp4(20), 'video/mp4').dataUrl, /^data:video\/mp4;base64,/);
  assert.throws(() => core.toVideoDataUrl(mp4(21), 'video/mp4'), /20 seconds/);
  assert.throws(() => core.toVideoDataUrl(mp4(10), 'video/webm'), /Unsupported video type/);
  assert.throws(() => core.toVideoDataUrl('bm90LXZpZGVv', 'video/mp4'), /does not match/);
});

test('authorization and budget checks precede validation and OpenRouter', () => {
  const auth = indexSource.indexOf('authenticatedUser(req)');
  const entitlement = indexSource.indexOf('verifyMachineVision(user.id)');
  const reserve = indexSource.indexOf('reserveUsage(admin, user.id');
  const validate = indexSource.indexOf('validateRequestBody(body)');
  const generate = indexSource.indexOf('generate(normalizedBody');
  assert.ok(auth >= 0 && auth < entitlement && entitlement < reserve && reserve < validate && validate < generate);
  assert.doesNotMatch(indexSource, /body\.(revenueCatCustomerId|appUserId|isPremium|machineVision)/);
  assert.match(indexSource, /active_entitlements/);
  assert.match(indexSource, /REVENUECAT_SECRET_API_KEY/);
});

test('weekly and daily limits are atomic and unavailable to app clients', () => {
  assert.match(migrationSource, /pg_advisory_xact_lock/);
  assert.match(migrationSource, /v_video >= 5/);
  assert.match(migrationSource, /v_weekly \+ p_reserved_cost_usd > 1\.90/);
  assert.match(indexSource, /WEEKLY_BUDGET_USD = 1\.90/);
  assert.match(migrationSource, /revoke all on function[\s\S]*authenticated/);
  assert.match(migrationSource, /grant execute[\s\S]*service_role/);
});

test('unpriced emergency model configuration cannot bypass cost controls', () => {
  assert.match(indexSource, /configuredEmergency === "openrouter\/free"/);
  assert.match(indexSource, /reserveUsage\(admin, userId, mode, model, false\)/);
  assert.match(indexSource, /greatest\(actual, reserved\)|Math\.max\(0, payload\.usage\.cost\)/);
});

test('Premium RevenueCat identity is derived from the authenticated Supabase session', () => {
  assert.match(identitySource, /supabase\.auth\.getSession\(\)/);
  assert.match(identitySource, /targetId = session\.user\.id/);
  assert.doesNotMatch(identitySource, /beginPremiumRevenueCatBinding\([^)]*(customerId|appUserId)/);
});

test('interrupted RevenueCat identity changes retain a rollback path', () => {
  const remember = identitySource.indexOf("Preferences.set({ key: PENDING_PREVIOUS_ID_KEY");
  const login = identitySource.indexOf('Purchases.logIn({ appUserID: targetId })');
  assert.ok(remember >= 0 && remember < login);
  assert.match(identitySource, /Purchases\.logIn\(\{ appUserID: binding\.previousId \}\)/);
  assert.match(identitySource, /recoverPendingRevenueCatBinding/);
});

test('anonymous Supabase identity persists and profile creation avoids empty upsert representations', () => {
  assert.match(supabaseSource, /autoRefreshToken: true/);
  assert.match(supabaseSource, /persistSession: true/);
  assert.match(authSessionSource, /auth\.signInAnonymously\(\)/);
  assert.doesNotMatch(supabaseSource, /ignoreDuplicates: true[\s\S]{0,80}\.select\(\)/);
});

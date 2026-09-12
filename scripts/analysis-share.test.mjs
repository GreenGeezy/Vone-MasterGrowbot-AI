import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function compile(source, mocks = {}) {
  const exports = {};
  new Function('require', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => mocks[name], exports);
  return exports;
}
const artwork = compile(await readFile(new URL('../services/analysisShareCard.ts', import.meta.url), 'utf8'));
let native = false;
let shareError;
const shares = [];
const files = new Set();
const service = compile(await readFile(new URL('../services/shareService.ts', import.meta.url), 'utf8'), {
  './analysisShareCard': artwork,
  '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
  '@capacitor/share': { Share: { share: async options => { shares.push(options); if (shareError) throw shareError; } } },
  '@capacitor/filesystem': { Directory: { Cache: 'CACHE' }, Filesystem: {
    writeFile: async ({ path, directory, data }) => { assert.equal(directory, 'CACHE'); assert.equal(data, 'cG5n'); files.add(path); return { uri: `file:///cache/${path}` }; },
    deleteFile: async ({ path }) => { files.delete(path); },
  } },
});
test('caption has honest AI context, correct tier and bounded content', () => {
  const caption = artwork.analysisCaption({ kind: 'video', headline: 'A'.repeat(1000), score: 50, privateLocation: 'private-location', topAction: 'private-advice' });
  assert.ok(caption.length < 700);
  assert.equal(caption, `See what MasterGrowbot AI noticed across my plant video.\n\n${artwork.SHARE_CTA}`);
  assert.doesNotMatch(caption, /diagnosis|limitations/);
  assert.doesNotMatch(caption, /private-location|private-advice/);
});
test('photo and video captions carry distinct store calls to action', () => {
  const photo = artwork.analysisCaption({ kind: 'photo', headline: 'Healthy', score: 80 });
  const video = artwork.analysisCaption({ kind: 'video', headline: 'Healthy', score: 80 });
  assert.match(photo, /plant photo/);
  assert.match(video, /plant video/);
  assert.ok(photo.includes(artwork.SHARE_CTA));
  assert.ok(video.includes(artwork.SHARE_CTA));
});
test('native caption share carries the real store link and cancellation is neutral', async () => {
  native = true;
  assert.equal(await service.shareAnalysisCard('My report', null), 'shared');
  assert.equal(shares[0].url, 'https://apps.apple.com/app/id6752221060');
  shareError = new Error('Share canceled');
  assert.equal(await service.shareAnalysisCard('My report', null), 'cancelled');
  shareError = new Error('Could not open share sheet');
  assert.equal(await service.shareAnalysisCard('My report', null), 'unavailable');
  shareError = undefined;
});
test('browser denial and unavailable sharing never report success', async () => {
  native = false;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    assert.equal(await service.shareAnalysisCard('Report', null), 'unavailable');
    assert.equal(await service.copyAnalysisCaption('Report'), false);
    globalThis.navigator.share = async () => { throw new DOMException('Cancelled', 'AbortError'); };
    assert.equal(await service.shareAnalysisCard('Report', null), 'cancelled');
    let copied;
    globalThis.navigator.clipboard = { writeText: async text => { copied = text; } };
    assert.equal(await service.copyAnalysisCaption('Report'), true);
    assert.ok(copied.includes(service.APP_STORE_URL));
    assert.ok(copied.includes(service.PLAY_STORE_URL));
    assert.ok(copied.includes(artwork.SHARE_CTA));
    assert.ok(copied.includes(artwork.TRIAL_TERMS));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else delete globalThis.navigator;
  }
});

test('native PNG uses local cache and cleans up after completion or cancellation', async () => {
  native = true;
  const previous = globalThis.FileReader;
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,cG5n'; this.onload(); } };
  try {
    assert.equal(await service.shareAnalysisCard('Report', new Blob(['png'])), 'shared');
    assert.match(shares.at(-1).files[0], /^file:\/\/\/cache\/analysis-share-.*\.png$/);
    assert.equal(files.size, 0);
    shareError = new Error('Share canceled');
    assert.equal(await service.shareAnalysisCard('Report', new Blob(['png'])), 'cancelled');
    assert.equal(files.size, 0);
  } finally { globalThis.FileReader = previous; shareError = undefined; }
});

test('edited caption retains both-store invitation and honest trial terms exactly once', () => {
  const caption = artwork.captionWithCTA('My own words');
  assert.ok(caption.includes(artwork.SHARE_CTA));
  assert.equal(artwork.captionWithCTA(caption), caption);
});

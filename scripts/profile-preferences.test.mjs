import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../services/profilePreferences.ts', import.meta.url), 'utf8');
const api = {};
new Function('exports', ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api);
test('saved avatar and personal settings survive a cloud profile refresh', () => {
  const merged = api.mergeProfilePreferences({id:'server',avatarUri:'old',name:'Old'}, {id:'local',avatarUri:'data:image/jpeg;base64,saved',name:'New'});
  assert.equal(merged.avatarUri,'data:image/jpeg;base64,saved');
  assert.equal(merged.name,'New');
  assert.equal(merged.id,'server');
});
test('preset persists, absent local values retain server values, corrupt cache is harmless', () => {
  assert.equal(api.mergeProfilePreferences({}, {avatarUri:'/assets/avatars/the_bot.png'}).avatarUri,'/assets/avatars/the_bot.png');
  assert.equal(api.mergeProfilePreferences({name:'Cloud'},null).name,'Cloud');
  const previous = globalThis.localStorage;
  try { globalThis.localStorage={getItem:()=>'{broken'}; assert.equal(api.cachedProfile(),null); }
  finally { globalThis.localStorage=previous; }
});

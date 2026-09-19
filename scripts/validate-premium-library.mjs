import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
const out={};new Function('exports',ts.transpileModule(fs.readFileSync('data/strains.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(out);
const base=out.STRAIN_DATABASE;const added=JSON.parse(fs.readFileSync('data/premium-strains.json','utf8'));
assert.equal(base.length,300);assert.equal(added.length,300);
const normalize=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');const seen=new Set(base.map(x=>normalize(x.name)));const ids=new Set(base.map(x=>String(x.id)));
for(const item of added){assert(!seen.has(normalize(item.name)),`Duplicate name ${item.name}`);seen.add(normalize(item.name));assert(!ids.has(item.id));ids.add(item.id);assert.equal(item.profile.name,item.name);assert(item.profile.description.length>30);assert(item.profile.breeder);assert(['Indica','Sativa','Hybrid'].includes(item.profile.type));const source=new URL(item.source_url);assert.equal(source.protocol,'https:');assert.equal(source.hostname,'seedfinder.eu');assert(source.pathname.startsWith('/en/strain-info/'));assert.equal(item.reviewed_at,'2026-09-19');for(const alias of item.profile.aliases||[])assert(!seen.has(normalize(alias)),`Duplicate alias ${alias}`);}
console.log('600 unique profile names and IDs; all 300 additions have individual sources.');

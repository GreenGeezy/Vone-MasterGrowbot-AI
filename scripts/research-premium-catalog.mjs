// Collect factual identifiers/classification with one individually checked source per entry.
// Never copy source descriptions, photos, cultivation directions or commercial links.
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile('data/strains.ts','utf8');const exports={};
new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const seen=new Set(exports.STRAIN_DATABASE.map(x=>normalize(x.name)));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#039;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const rows=[];await fs.mkdir('output/catalog-research',{recursive:true});
async function fetchPage(url) {const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Source HTTP ${r.status}`);return r.text();}
for(const letter of 'ABCDEFGHIJKLMNOPRSTUVWXYZ') {
 if(rows.length>=300)break;
 const listing=await fetchPage(`https://seedfinder.eu/en/database/strains/alphabetical/${letter}`);
 const links=[...listing.matchAll(/<a class="link" href="(https:\/\/seedfinder.eu\/en\/strain-info\/[^"#]+)">([^<]+)<\/a>/g)];
 let accepted=0;
 for(const [,url,rawName] of links) {
  const name=decode(rawName).trim();const normalized=normalize(name);
  if(seen.has(normalized)||name.length>65||!normalized||/auto|feminized|regular|\bx\b|f[1-9]|s[1-9]/i.test(name))continue;
  try {
   const html=await fetchPage(url);
   const graph=[...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].flatMap(x=>JSON.parse(x[1])['@graph']||[]);
   const product=graph.find(x=>x['@type']==='Product');
   const crumbs=graph.find(x=>x['@type']==='BreadcrumbList')?.itemListElement||[];
   if(!product||normalize(product.name)!==normalized)continue;
   const classification=product.additionalProperty?.find(x=>x.name==='Type')?.value;
   if(!classification||/unknown/i.test(classification))continue;
   const breeder=crumbs.find(x=>String(x.item?.['@id']).includes('/database/breeder/'))?.item?.name;
   if(!breeder)continue;
   const type=/indica/i.test(classification)&&!/sativa|hybrid/i.test(classification)?'Indica':/sativa/i.test(classification)&&!/indica|hybrid/i.test(classification)?'Sativa':'Hybrid';
   const id=`premium-${normalized}`;
   rows.push({id,name,profile:{name,type,classification,breeder,aliases:[],description:`${name} is listed as ${String(classification).toLowerCase()} in the ${breeder} reference entry.`,thc_level:'Not established',cbd_level:'Not established',most_common_terpene:'Not established'},source_url:url,reviewed_at:'2026-09-19'});
   seen.add(normalized);accepted++;
   await fs.writeFile(`output/catalog-research/${id}.json`,JSON.stringify({url,name:product.name,classification,breeder},null,2));
  }catch(e){console.log('Skipped',name,e.message);}
  if(accepted>=13||rows.length>=300)break;
 }
 console.log(letter,accepted,'total',rows.length);
 await fs.writeFile('data/premium-strains.json',JSON.stringify(rows,null,2)+'\n');
}
if(rows.length!==300)throw Error(`Expected 300 independently sourced profiles; found ${rows.length}`);
console.log('Validated source records:',rows.length);

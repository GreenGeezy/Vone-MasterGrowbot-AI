import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,()=>{throw Error('Unexpected dependency');});return exports;}
const {buildGrowPlan,previousCheck,planChecks}=load('services/growPlan.ts');
const {canSuggestPremium,notePhotoReport,dismissPremiumSuggestion,markPremiumSuggested}=load('services/premiumPrompts.ts');
const DAY=86400000, now=new Date(2026,10,10,15).getTime();
const entry=(daysAgo,score,extra={})=>({id:String(now-daysAgo*DAY),createdAt:new Date(now-daysAgo*DAY).toISOString(),diagnosisData:{healthScore:score,topAction:'Check runoff pH',diagnosis:'Example'},...extra});
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};

test('plan has not started without a saved report',()=>{
  assert.deepEqual(buildGrowPlan([{id:'a',journal:[{id:'1',notes:'note only'}]}],now),{started:false});
});
test('first saved report starts day 1 and points at tomorrow',()=>{
  const p=buildGrowPlan([{id:'a',name:'Tent 1',journal:[entry(0,72)]}],now);
  assert.equal(p.started,true);assert.equal(p.day,1);assert.equal(p.done,1);
  assert.equal(p.checkedToday,true);assert.equal(p.next.day,2);assert.equal(p.trend,null);
});
test('several reports on one day count as one check-in and the latest score wins',()=>{
  const checks=planChecks({journal:[entry(0.1,60),entry(0,75)]});
  assert.equal(checks.length,1);assert.equal(checks[0].score,75);
});
test('score change and trend come only from saved scores',()=>{
  const p=buildGrowPlan([{id:'a',journal:[entry(2,70),entry(1,74),entry(0,79)]}],now);
  assert.equal(p.day,3);assert.equal(p.done,3);assert.equal(p.delta,9);assert.equal(p.trend,'improving');assert.equal(p.next.day,5);
  assert.equal(buildGrowPlan([{id:'a',journal:[entry(1,80),entry(0,70)]}],now).trend,'needs attention');
  assert.equal(buildGrowPlan([{id:'a',journal:[entry(1,80),entry(0,81)]}],now).trend,'holding steady');
});
test('a missed day keeps the plan open for the next check-in',()=>{
  const p=buildGrowPlan([{id:'a',journal:[entry(3,70)]}],now);
  assert.equal(p.day,4);assert.equal(p.checkedToday,false);assert.equal(p.next.day,2);
});
test('five check-in days complete the plan and the most recently checked plant is the focus',()=>{
  const p=buildGrowPlan([{id:'old',journal:[entry(9,50)]},{id:'a',journal:[6,5,4,2,0].map((d,i)=>entry(d,70+i))}],now);
  assert.equal(p.plantId,'a');assert.equal(p.complete,true);assert.equal(p.next,null);
});
test('in-report comparison uses an earlier day, never a report from today',()=>{
  assert.equal(previousCheck({journal:[entry(0,70)]},now),null);
  assert.equal(previousCheck({journal:[entry(1,66),entry(0,70)]},now).score,66);
});
test('Premium suggestion: not on the first report, not for low severity, weekly at most, quiet after dismissal',()=>{
  const s=store();
  notePhotoReport(s);assert.equal(canSuggestPremium('high',now,s),false);
  notePhotoReport(s);assert.equal(canSuggestPremium('low',now,s),false);assert.equal(canSuggestPremium('medium',now,s),true);
  markPremiumSuggested(now,s);assert.equal(canSuggestPremium('high',now+6*DAY,s),false);assert.equal(canSuggestPremium('high',now+8*DAY,s),true);
  dismissPremiumSuggestion(now+8*DAY,s);assert.equal(canSuggestPremium('high',now+20*DAY,s),false);assert.equal(canSuggestPremium('high',now+40*DAY,s),true);
});

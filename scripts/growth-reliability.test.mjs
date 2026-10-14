import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(path){const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,(id)=>{if(id==='../types')return load('types.ts');throw Error('Unexpected dependency '+id);});return exports;}
const {deleteAccountWithConfirmation}=load('services/accountDeletion.ts');
const {removeAccount}=load('supabase/functions/delete-account/workflow.ts');
const {trialDuration,receiptEnvironment}=load('services/subscriptionDisclosure.ts');
const {hasVerifiedPaidAccess}=load('services/paidAccess.ts');
test('Premium includes Pro access; expired history alone never grants access',()=>{assert.equal(hasVerifiedPaidAccess({entitlements:{active:{machine_vision:{}}}}),true);assert.equal(hasVerifiedPaidAccess({entitlements:{active:{pro:{}}}}),true);assert.equal(hasVerifiedPaidAccess({entitlements:{active:{}},allPurchasedProductIdentifiers:['monthly_pro_v2']}),false);});
test('onboarding assignment remains stable and does not reset a draft',()=>{const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};const {onboardingVariant}=load('services/onboardingState.ts');const first=onboardingVariant(true);assert.equal(onboardingVariant(true),first);assert.equal(onboardingVariant(false),'treatment');assert.equal(onboardingVariant(true),first);});
test('event metadata omits private text and retains billing identity for reconciliation',()=>{const {eventMetadata}=load('supabase/functions/premium-library/rules.ts');assert.deepEqual(eventMetadata({private_text:'private',rc_app_user_id:'$RCAnonymousID:sample',step:'2',filename:'secret.png'}),{rc_app_user_id:'$RCAnonymousID:sample',step:'2'});});
test('trial duration comes from StoreKit fields; unknown durations are not invented',()=>{assert.equal(trialDuration({periodNumberOfUnits:3,periodUnit:'DAY'}),'3 days');assert.equal(trialDuration({periodNumberOfUnits:1,periodUnit:'WEEK'}),'1 week');assert.equal(trialDuration(),null);});
test('receipt environment separates sandbox, production and unknown acquisition',()=>{assert.equal(receiptEnvironment({entitlements:{all:{pro:{isSandbox:true}}}}),'sandbox');assert.equal(receiptEnvironment({entitlements:{all:{pro:{isSandbox:false}}}}),'production');assert.equal(receiptEnvironment({}), 'unverified');});
test('failed or unconfirmed deletion never clears device state',async()=>{
  let cleared=false;
  for(const remove of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({})]){
    await assert.rejects(deleteAccountWithConfirmation({remove,clear:()=>{cleared=true;}}));assert.equal(cleared,false);
  }
});
test('only confirmed deletion clears device state',async()=>{let cleared=false;assert.equal(await deleteAccountWithConfirmation({remove:async()=>({ok:true}),clear:()=>{cleared=true;}}),true);assert.equal(cleared,true);});
test('storage failure prevents database/auth deletion',async()=>{let finished=false;await assert.rejects(removeAccount({manifest:async()=>[{bucket_id:'user_uploads',name:'owned/file'}],removeObjects:async()=>{throw Error('storage offline');},finish:async()=>{finished=true;}}));assert.equal(finished,false);});
test('storage batches remain scoped and transaction runs last',async()=>{
  const calls=[];const objects=Array.from({length:201},(_,i)=>({bucket_id:'user_uploads',name:`owner/${i}`}));objects.push({bucket_id:'journal_documents',name:'owner/note'});
  assert.deepEqual(await removeAccount({manifest:async()=>objects,removeObjects:async(b,p)=>calls.push([b,p.length]),finish:async()=>calls.push(['finish'])}),{ok:true});
  assert.deepEqual(calls,[['user_uploads',100],['user_uploads',100],['user_uploads',1],['journal_documents',1],['finish']]);
});
test('onboarding survives resume and preserves selected destination',()=>{
  const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  const {readOnboarding,writeOnboarding,completeOnboarding,initialDestination}=load('services/onboardingState.ts');
  writeOnboarding({version:2,step:3,profile:{onboardingIntent:'journal',experience:'Novice'},completed:false});
  assert.equal(readOnboarding().step,3);assert.equal(initialDestination(readOnboarding().profile),'journal');completeOnboarding();assert.equal(readOnboarding().completed,true);
  storage.set('mg_onboarding_v2','broken');assert.equal(readOnboarding().step,0);
});

test('goals map to achievable first actions and unsure answers preserve honest preferences',()=>{
 const {answerOnboarding,initialDestination,goalDetails}=load('services/onboardingState.ts');
 let p=answerOnboarding({},'onboardingGoal','skills');assert.equal(initialDestination(p),'strains');assert.equal(goalDetails(p).title,'Get better at growing');
 p=answerOnboarding(p,'onboardingGoal','size');assert.equal(initialDestination(p),'journal');assert.equal(goalDetails(p).title,'Grow bigger plants');
 p=answerOnboarding(p,'experience','not_sure');assert.equal(p.experienceUndecided,true);
 p=answerOnboarding(p,'grow_mode','Indoor');p=answerOnboarding(p,'grow_mode','not_sure');assert.equal(p.grow_mode,undefined);assert.equal(p.growSetupUndecided,true);
 p=answerOnboarding(p,'onboardingGoal','explore');assert.equal(initialDestination(p),'home');
 p=answerOnboarding(p,'experience','Expert');assert.equal(p.experienceUndecided,false);
 p=answerOnboarding(p,'grow_mode','Outdoor');assert.equal(p.growSetupUndecided,false);
});

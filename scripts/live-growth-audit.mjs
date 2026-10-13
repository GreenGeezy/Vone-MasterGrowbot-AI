// Creates and deletes only disposable accounts created by this run. Never imports device sessions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const env=fs.readFileSync('.env.local','utf8');
const key=env.match(/^VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m)?.[1]?.trim();
if(!key)throw Error('Public Supabase key missing');
const direct='https://vofwdhlwsahwxecewyek.supabase.co';
const proxy='https://auth.mastergrowbotai.com';
const results=[];const accounts=[];
const runId=`growth-${Date.now()}`;
let failure;
function check(condition,name){assert.ok(condition,name);results.push({check:name,result:'passed'});}
const headers=(session)=>({apikey:key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'});
const clients=[direct,proxy].map(url=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(20000)})}}));
try {
 for(const url of [direct,proxy]){
   const r=await fetch(`${url}/auth/v1/health`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
   check(r.ok,`${url===direct?'Direct':'Proxy'} TLS/auth health`);
   const options=await fetch(`${url}/functions/v1/conversion-events`,{method:'OPTIONS',headers:{Origin:'capacitor://localhost','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'},signal:AbortSignal.timeout(15000)});
   check(options.ok && (options.headers.get('access-control-allow-headers')||'').toLowerCase().includes('authorization'),`${url===direct?'Direct':'Proxy'} JWT preflight`);
 }
 for(let i=0;i<clients.length;i++){
   const c=clients[i];const {data,error}=await c.auth.signInAnonymously({options:{data:{release_audit:runId}}});if(error)throw error;
   const session=data.session;accounts.push({client:c,session});check(Boolean(session?.user.is_anonymous),`${i?'Proxy':'Direct'} anonymous authentication`);
   const refreshed=await c.auth.refreshSession();if(refreshed.error)throw refreshed.error;
   check(refreshed.data.user.id===session.user.id,`${i?'Proxy':'Direct'} refresh preserves identity`);accounts[i].session=refreshed.data.session;
   const p=await c.from('profiles').upsert({id:session.user.id},{onConflict:'id',ignoreDuplicates:true});if(p.error)throw p.error;
 }
 const a=accounts[0],b=accounts[1];
 const isolated=await b.client.from('profiles').select('id').eq('id',a.session.user.id);if(isolated.error)throw isolated.error;
 check(isolated.data.length===0,'Second anonymous user cannot read first profile');
 const invalid=await b.client.rpc('finish_account_deletion',{target_user:a.session.user.id});check(Boolean(invalid.error),'Client cannot execute privileged deletion RPC');
 const uploaded=await a.client.storage.from('user_uploads').upload(`${a.session.user.id}/release-audit/test.txt`,new Blob(['Disposable release audit fixture'],{type:'text/plain'}),{upsert:false});
 if(uploaded.error)throw uploaded.error;
 const eventId=crypto.randomUUID();
 const event={id:eventId,action:'event',event:'onboarding_view',surface:'onboarding',version:'2.0.0',metadata:{environment:'sandbox',platform:'iOS',build:'audit',step:'0',private_text:'must_be_removed'}};
 for(let repeat=0;repeat<2;repeat++){
   const r=await fetch(`${proxy}/functions/v1/conversion-events`,{method:'POST',headers:headers(b.session),body:JSON.stringify(event),signal:AbortSignal.timeout(20000)});check(r.ok,`JWT analytics write${repeat?' idempotent retry':''}`);
   check(r.headers.get('cache-control')?.includes('no-store'),'Authenticated analytics response does not cache');
 }
 const bad=await fetch(`${direct}/functions/v1/delete-account`,{method:'POST',headers:headers(a.session),body:JSON.stringify({confirm:'no'}),signal:AbortSignal.timeout(20000)});check(bad.status===400,'Deletion requires explicit confirmation');
} catch(error) { failure=error; } finally {
 for(const account of accounts){
   const r=await fetch(`${direct}/functions/v1/delete-account`,{method:'POST',headers:headers(account.session),body:JSON.stringify({confirm:'DELETE'}),signal:AbortSignal.timeout(60000)});
   const body=await r.json();if(!r.ok||body.ok!==true){failure ||= Error(`Disposable deletion failed: HTTP ${r.status}`);results.push({check:'Disposable account deletion',result:'failed',status:r.status});continue;}
   check(true,'Disposable account deletion confirmed');
   const probe=await account.client.auth.getUser();check(Boolean(probe.error),'Deleted user JWT cannot authenticate');
   const staleWrite=await fetch(`${direct}/rest/v1/tasks`,{method:'POST',headers:headers(account.session),body:JSON.stringify({user_id:account.session.user.id,title:'Disposable stale JWT check'}),signal:AbortSignal.timeout(20000)});
   check(staleWrite.status===401||staleWrite.status===403,'Deleted account JWT cannot write orphan tasks');
 }
 fs.mkdirSync('output/ios-growth',{recursive:true});fs.writeFileSync('output/ios-growth/V5MasterGrowbotLiveAudit.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
}
console.log(JSON.stringify({checks:results.length,results},null,2));
if(failure)throw failure;

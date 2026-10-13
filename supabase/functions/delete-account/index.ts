import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { removeAccount } from './workflow.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  try {
    const url=Deno.env.get('SUPABASE_URL')!;
    const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error}=await client.auth.getUser();
    if(error||!user)return reply({error:'Restore your saved session before deleting your account.'},401);
    const body=await req.json();
    if(body.confirm!=='DELETE')return reply({error:'Explicit deletion confirmation is required.'},400);
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    // Never accept a target user ID from the request body.
    const uid=user.id;
    const result=await removeAccount({
      manifest:async()=>{const r=await admin.rpc('account_deletion_manifest',{target_user:uid});if(r.error)throw r.error;return r.data||[];},
      removeObjects:async(bucket,paths)=>{const r=await admin.storage.from(bucket).remove(paths);if(r.error)throw r.error;},
      finish:async()=>{const r=await admin.rpc('finish_account_deletion',{target_user:uid});if(r.error)throw r.error;}
    });
    return reply(result);
  } catch {return reply({error:'Account deletion could not finish. Keep the app open and retry. Your device data has been kept.'},503);}
});

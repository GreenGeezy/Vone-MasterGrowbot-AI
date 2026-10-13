import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { EVENTS, SURFACES, eventMetadata } from '../premium-library/rules.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try {
  if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'Event too large'},400);
  const url=Deno.env.get('SUPABASE_URL')!;
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return reply({error:'Session unavailable'},401);
  const body=await req.json();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id||'')||!EVENTS.has(body.event)||!SURFACES.has(body.surface)||!/^\d+\.\d+\.\d+$/.test(body.version||''))return reply({error:'Invalid event'},400);
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {count,error:countError}=await admin.from('conversion_events').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',new Date(Date.now()-3600000).toISOString());
  if(countError)return reply({error:'Event unavailable'},503);
  if((count||0)>=120)return reply({ok:true});
  const r=await admin.from('conversion_events').upsert({id:body.id,user_id:user.id,event:body.event,surface:body.surface,version:body.version,metadata:eventMetadata(body.metadata)},{onConflict:'id',ignoreDuplicates:true});
  if(r.error)return reply({error:'Event unavailable'},503);
  return reply({ok:true});
 }catch{return reply({error:'Event unavailable'},503);}
});

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { EVENTS, SURFACES, validateDocument } from './rules.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
class ApiError extends Error { constructor(message:string,public status=400,public code='request_failed'){super(message);} }
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function requirePremium(userId:string) {
 const key=Deno.env.get('REVENUECAT_SECRET_API_KEY');
 if(!key) throw new ApiError('Subscription verification is temporarily unavailable.',503);
 let r:Response;
 try {r=await fetch(`https://api.revenuecat.com/v2/projects/projf176df92/customers/${encodeURIComponent(userId)}/active_entitlements`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});}catch{throw new ApiError('Subscription verification is temporarily unavailable.',503);}
 if(r.status===404) throw new ApiError('Premium is required for this feature.',403,'premium_required');
 if(!r.ok) throw new ApiError('Subscription verification is temporarily unavailable.',503);
 const data=await r.json();
 if(!data.items?.some((x:any)=>x.entitlement_id==='entl05530ace9d'&&(x.expires_at==null||x.expires_at>Date.now()))) throw new ApiError('Premium is required for this feature.',403,'premium_required');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return response({error:'Method not allowed'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL')!;
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user) throw new ApiError('Your session needs to be refreshed.',401);
  const userId=user.id;
  const bucket=admin.storage.from('journal_documents');
  const isUpload=(req.headers.get('content-type')||'').startsWith('multipart/form-data');
  const body=isUpload?null:await req.json();
  const action=isUpload?'upload':body?.action;
  const {data:flags,error:flagError}=await admin.from('mobile_features').select('*').eq('id',true).single();
  if(flagError) throw new ApiError('This feature is temporarily unavailable.',503);
  if(action==='config') {
   const {count}=await admin.from('premium_strain_profiles').select('id',{count:'exact',head:true});
   return response({uploads:flags.uploads_enabled,catalog:flags.catalog_enabled,catalogCount:flags.catalog_enabled?count:0});
  }
  if(action==='event') {
   if(!uuid(body.id)||!EVENTS.has(body.event)||!SURFACES.has(body.surface)||!/^\d+\.\d+\.\d+$/.test(body.version)) throw new ApiError('Invalid event');
   const {count}=await admin.from('conversion_events').select('id',{head:true,count:'exact'}).eq('user_id',userId).gte('created_at',new Date(Date.now()-3600000).toISOString());
   if((count||0)>=120) return response({ok:true});
   const {error}=await admin.from('conversion_events').upsert({id:body.id,user_id:userId,event:body.event,surface:body.surface,version:body.version},{onConflict:'id',ignoreDuplicates:true});
   if(error) throw new ApiError('Event unavailable',503);
   return response({ok:true});
  }
  if(action==='catalog') {
   if(!flags.catalog_enabled) return response({items:[],more:false});
   const offset=Number.isSafeInteger(body.offset)&&body.offset>=0?Math.min(body.offset,10000):0;
   const query=typeof body.query==='string'?body.query.slice(0,80).replace(/[%_\\]/g,''):'';
   let q=admin.from('premium_strain_profiles').select('id,name').order('name').range(offset,offset+30);
   if(query) q=q.ilike('name',`%${query}%`);
   const {data,error}=await q;
   if(error) throw new ApiError('Catalog unavailable',503);
   return response({items:data?.slice(0,30)||[],more:(data?.length||0)>30});
  }
  if(action==='profile') {
   if(!flags.catalog_enabled) throw new ApiError('The expanded library is temporarily unavailable.',503);
   await requirePremium(userId);
   const {data,error}=await admin.from('premium_strain_profiles').select('id,name,profile,source_url,reviewed_at').eq('id',String(body.id).slice(0,150)).single();
   if(error||!data) throw new ApiError('Profile unavailable',404);
   return response(data);
  }
  if(action==='list') {
   let q=admin.from('journal_attachments').select('id,entry_id,draft_id,filename,mime_type,byte_size,state,created_at').eq('user_id',userId).eq('state','ready').not('entry_id','is',null).order('created_at',{ascending:false});
   if(body.entryId) q=q.eq('entry_id',body.entryId);
   const {data,error}=await q;
   if(error) throw new ApiError('Files unavailable. Please retry.',503);
   return response({items:data||[]});
  }
  if(action==='open'||action==='delete') {
   if(!uuid(body.id)) throw new ApiError('File unavailable',404);
   const {data:file,error}=await admin.from('journal_attachments').select('*').eq('id',body.id).eq('user_id',userId).single();
   if(error||!file) throw new ApiError('File unavailable',404);
   if(action==='open') {
    if(file.state!=='ready') throw new ApiError('This file has not finished uploading.');
    const {data,error}=await bucket.createSignedUrl(file.object_path,60,{download:file.filename});
    if(error) throw new ApiError('Could not open this file. Please retry.',503);
    return response({url:data.signedUrl});
   }
   const {error:removeError}=await bucket.remove([file.object_path]);
   if(removeError) throw new ApiError('Could not delete this file. Please retry.',503);
   const {error:deleteError}=await admin.from('journal_attachments').delete().eq('id',file.id).eq('user_id',userId);
   if(deleteError) throw new ApiError('Could not finish deleting. Please retry.',503);
   return response({ok:true});
  }
  if(action==='upload') {
   if(!flags.uploads_enabled) throw new ApiError('New file uploads are temporarily unavailable.',503);
   await requirePremium(userId);
   if(Number(req.headers.get('content-length')||0)>10600000) throw new ApiError('Choose a file up to 10 MB.');
   const form=await req.formData();const file=form.get('file');const id=form.get('id');const draft=form.get('draftId');
   if(!(file instanceof File)||!uuid(id)||!uuid(draft)) throw new ApiError('Invalid file upload.');
   if(file.size>10485760) throw new ApiError('Choose a file up to 10 MB.');
   const bytes=new Uint8Array(await file.arrayBuffer());let mime:string;
   try {mime=validateDocument(file.name,bytes);}catch(error){throw new ApiError((error as Error).message);}
   // Bounded cleanup of abandoned drafts; saved entries are never removed.
   const {data:stale}=await admin.from('journal_attachments').select('id,object_path').is('entry_id',null).lt('created_at',new Date(Date.now()-86400000).toISOString()).limit(20);
   for(const old of stale||[]) {const {error}=await bucket.remove([old.object_path]);if(!error) await admin.from('journal_attachments').delete().eq('id',old.id);}
   const {data:reserved,error}=await admin.rpc('reserve_journal_attachment',{p_user:userId,p_id:id,p_draft:draft,p_name:file.name,p_mime:mime,p_bytes:file.size});
   if(error) throw new ApiError(error.message,409);
   if(reserved.state==='ready') return response({id:reserved.id});
   const {error:uploadError}=await bucket.upload(reserved.object_path,bytes,{contentType:mime,upsert:false});
   if(uploadError) {
    // A timed-out successful write can safely be finalized, never overwritten.
    const {data:existing}=await bucket.info(reserved.object_path);
    if(!existing||Number(existing.size)!==file.size) throw new ApiError('Upload did not finish. Retry this file.',503);
   }
   const {data:ready,error:readyError}=await admin.from('journal_attachments').update({state:'ready'}).eq('id',id).eq('user_id',userId).select('id').maybeSingle();
   if(readyError) throw new ApiError('Upload needs confirmation. Retry this file.',503);
   if(!ready){await bucket.remove([reserved.object_path]);throw new ApiError('This upload was removed. Select the file again.',409);}
   // A save from another request may have preceded upload completion.
   const {data:entry}=await admin.from('journal_logs').select('id').eq('id',draft).eq('user_id',userId).maybeSingle();
   if(entry) await admin.from('journal_attachments').update({entry_id:entry.id}).eq('id',id).eq('user_id',userId);
   return response({id});
  }
  throw new ApiError('Unknown action');
 }catch(error){const e=error as ApiError;return response({error:e instanceof ApiError?e.message:'The service is temporarily unavailable. Please retry.',code:e instanceof ApiError?e.code:'request_failed'},e instanceof ApiError?e.status:503);}
});

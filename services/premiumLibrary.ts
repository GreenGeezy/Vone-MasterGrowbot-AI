import { CONFIG } from './config';
import { initializeSupabaseSession, supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { proFirstRelease } from './releaseFeatures';
import { withTimeout } from './appInitializer';

export type Attachment = {id:string;entry_id:string|null;draft_id:string;filename:string;mime_type:string;byte_size:number};
export type LibraryConfig = {uploads:boolean;catalog:boolean;catalogCount:number};
export const safeConfig:LibraryConfig={uploads:false,catalog:false,catalogCount:0};
export async function libraryRequest(body:Record<string,unknown>|FormData,onProgress?:(value:number)=>void):Promise<any> {
 let session=await withTimeout(initializeSupabaseSession(),15000,'Saved session');const owner=session.user.id;
 for(let attempt=0;attempt<2;attempt++) {
  if(!session?.access_token||session.user.id!==owner) throw new Error('Reopen the app to restore your saved session.');
  const result=await new Promise<{status:number;data:any}>((resolve,reject)=>{
   const xhr=new XMLHttpRequest();xhr.open('POST',`${CONFIG.SUPABASE_URL}/functions/v1/premium-library`);xhr.timeout=30000;
   xhr.setRequestHeader('apikey',CONFIG.SUPABASE_ANON_KEY);xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);
   if(!(body instanceof FormData)) xhr.setRequestHeader('Content-Type','application/json');
   xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(Math.min(99,Math.round(e.loaded/e.total*100)));};
   xhr.onload=()=>{let data:any;try{data=JSON.parse(xhr.responseText);}catch{reject(new Error('The service could not respond. Please retry.'));return;}resolve({status:xhr.status,data});};
   xhr.onerror=()=>reject(new Error('Connection lost. Please retry.'));xhr.ontimeout=()=>reject(new Error('The request took too long. Please retry.'));
   xhr.send(body instanceof FormData?body:JSON.stringify(body));
  });
  if(result.status===401&&attempt===0){const r=await supabase.auth.refreshSession();if(r.error)throw r.error;session=r.data.session;continue;}
  if(result.status<200||result.status>=300) throw Object.assign(new Error(result.data.error||'Please retry.'),{code:result.data.code});
  onProgress?.(100);return result.data;
 }
 throw new Error('Session unavailable. Please reopen the app.');
}
export const getLibraryConfig=():Promise<LibraryConfig>=>proFirstRelease?libraryRequest({action:'config'}).catch(()=>safeConfig):Promise.resolve(safeConfig);
export function recordEvent(event:string,surface:string) {
 if(!proFirstRelease)return;
 // Never delay user work or include user-entered content in diagnostics.
 void libraryRequest({action:'event',id:crypto.randomUUID(),event,surface,version:'1.6.12'}).catch(()=>{});
}
export async function openAttachment(file:Attachment) {
 const {url}=await libraryRequest({action:'open',id:file.id});
 if(Capacitor.isNativePlatform()) {
  const {Filesystem,Directory}=await import('@capacitor/filesystem');const {Share}=await import('@capacitor/share');
  const path=`journal-${file.id}.${file.filename.split('.').pop()}`;
  try {
   await Filesystem.downloadFile({url,path,directory:Directory.Cache});
   const {uri}=await Filesystem.getUri({path,directory:Directory.Cache});
   await Share.share({title:file.filename,files:[uri],dialogTitle:'Open or save file'});
  }finally{await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{});}
 } else {
  const response=await fetch(url);if(!response.ok)throw new Error('File link expired. Please try again.');
  const local=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=local;link.download=file.filename;link.click();setTimeout(()=>URL.revokeObjectURL(local),60000);
 }
 recordEvent('attachment_open','journal');
}

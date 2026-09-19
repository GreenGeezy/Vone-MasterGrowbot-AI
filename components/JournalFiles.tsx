import React,{useEffect,useState} from 'react';
import {Attachment,libraryRequest,openAttachment,recordEvent} from '../services/premiumLibrary';
export default function JournalFiles({entryId,onChanged}:{entryId?:string;onChanged?:()=>void}) {
 const [files,setFiles]=useState<Attachment[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState('');const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{if(entryId&&!/^[0-9a-f-]{36}$/i.test(entryId)){setFiles([]);return;}const r=await libraryRequest({action:'list',entryId});setFiles(r.items);}catch(e:any){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{void load();},[entryId]);
 return <section aria-label="Journal files" className="space-y-3 my-4">
  {error&&<p role="alert" className="text-sm text-red-700">{error} <button className="underline min-h-11" onClick={()=>{setError('');void load();}}>Retry</button></p>}
  {loading&&<p role="status" className="text-sm text-gray-500">Loading saved files…</p>}
  {!loading&&!files.length&&!error&&<p className="text-sm text-gray-500">No saved files here yet. Attach a file when you add a note.</p>}
  {files.map(file=><div key={file.id} className="border rounded-xl p-3 bg-white"><p className="font-semibold text-sm break-words">{file.filename}</p><p className="text-xs text-gray-500">{file.filename.split('.').pop()?.toUpperCase()} · {(file.byte_size/1024).toFixed(0)} KB</p><div className="flex gap-4">
   <button disabled={!!busy} className="min-h-11 text-emerald-700 font-bold text-sm" onClick={async()=>{setBusy(file.id);setError('');try{await openAttachment(file);}catch(e:any){setError(e.message);}finally{setBusy('');}}}>{busy===file.id?'Please wait…':'Open / download'}</button>
   <button disabled={!!busy} className="min-h-11 text-red-700 text-sm" onClick={async()=>{if(!confirm('Delete this file permanently?'))return;setBusy(file.id);setError('');try{await libraryRequest({action:'delete',id:file.id});setFiles(f=>f.filter(x=>x.id!==file.id));recordEvent('attachment_delete','journal');onChanged?.();}catch(e:any){setError(e.message);}finally{setBusy('');}}}>Delete file</button>
  </div></div>)}
 </section>;
}

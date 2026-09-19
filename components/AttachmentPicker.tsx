import React,{useRef,useState} from 'react';
import {libraryRequest,recordEvent} from '../services/premiumLibrary';
import PremiumPaywall from '../screens/PremiumPaywall';
type Item={id:string;file:File;progress:number;state:'uploading'|'ready'|'failed';error?:string};
export default function AttachmentPicker({draftId,onState,disabled}:{draftId:string;onState:(ready:number,pending:boolean)=>void;disabled:boolean}) {
 const [items,setItems]=useState<Item[]>([]);const current=useRef<Item[]>([]);const [paywall,setPaywall]=useState(false);const [error,setError]=useState('');const input=useRef<HTMLInputElement>(null);
 const update=(next:Item[])=>{current.current=next;setItems(next);onState(next.filter(x=>x.state==='ready').length,next.some(x=>x.state!=='ready'));};
 const change=(id:string,patch:Partial<Item>)=>update(current.current.map(x=>x.id===id?{...x,...patch}:x));
 const upload=async(item:Item)=>{
  change(item.id,{state:'uploading',error:''});const form=new FormData();form.append('file',item.file);form.append('id',item.id);form.append('draftId',draftId);
  try{await libraryRequest(form,n=>change(item.id,{progress:n}));change(item.id,{state:'ready',progress:100});recordEvent('attachment_upload','journal');}
  catch(e:any){change(item.id,{state:'failed',error:e.message});if(e.code==='premium_required')setPaywall(true);}
 };
 return <div className="mt-4 border-t pt-4"><button type="button" disabled={disabled||items.length>=5} onClick={()=>input.current?.click()} className="min-h-11 px-3 border rounded-xl font-bold text-sm">Attach file <span className="text-xs text-gray-500">Premium</span></button>
 <p className="text-xs text-gray-500 mt-2">PDF, DOCX, XLSX, CSV or TXT · 10 MB per file · 5 per note · 100 MB total. Files are saved privately. Restore Purchases restores access, not a lost anonymous journal.</p>
 <input ref={input} type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(!/\.(pdf|docx|xlsx|csv|txt)$/i.test(file.name)||file.size>10485760||!file.size){setError('Choose a supported file up to 10 MB.');return;}setError('');const item:Item={id:crypto.randomUUID(),file,progress:0,state:'uploading'};update([...current.current,item]);void upload(item);}} />
 {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
 {items.map(item=><div key={item.id} className="mt-3 p-3 rounded-xl bg-gray-50 text-sm"><p className="break-words font-semibold">{item.file.name}</p><p className="text-xs">{(item.file.size/1024).toFixed(0)} KB · {item.state==='ready'?'Ready to save':item.state==='uploading'?`Uploading ${item.progress}%`:item.error}</p>
 {item.state==='failed'&&<button disabled={disabled} onClick={()=>void upload(item)} className="min-h-11 underline mr-4">Retry</button>}
 <button disabled={disabled||item.state==='uploading'} className="min-h-11 text-red-700" onClick={async()=>{setError('');try{await libraryRequest({action:'delete',id:item.id});update(current.current.filter(x=>x.id!==item.id));}catch(e:any){if(e.message==='File unavailable')update(current.current.filter(x=>x.id!==item.id));else setError(e.message);}}}>Remove</button></div>)}
 {paywall&&<PremiumPaywall onClose={()=>setPaywall(false)} onUnlocked={()=>{setPaywall(false);const item=current.current.find(x=>x.state==='failed');if(item)void upload(item);}} />}
 </div>;
}

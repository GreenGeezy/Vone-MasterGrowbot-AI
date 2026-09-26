import React,{useEffect,useState,useRef} from 'react';
import {getLibraryConfig,libraryRequest,recordEvent} from '../services/premiumLibrary';
import PremiumPaywall from '../screens/PremiumPaywall';
import { StrainDetailModal } from './StrainDetailModal';
import type { Strain } from '../types';
export default function PremiumCatalog({onAddPlant}:any) {
 const [enabled,setEnabled]=useState(false);const [expanded,setExpanded]=useState(false);const [query,setQuery]=useState('');const [items,setItems]=useState<any[]>([]);const [more,setMore]=useState(false);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [profile,setProfile]=useState<any>(null);const [locked,setLocked]=useState<string|null>(null);const request=useRef(0);
 useEffect(()=>{void getLibraryConfig().then(c=>setEnabled(c.catalog&&c.catalogCount===300));},[]);
 const load=async(offset=0)=>{const generation=++request.current;setLoading(true);setError('');try{const r=await libraryRequest({action:'catalog',offset,query});if(generation===request.current){setItems(old=>offset?[...old,...r.items]:r.items);setMore(r.more);}}catch(e:any){if(generation===request.current)setError(e.message);}finally{if(generation===request.current)setLoading(false);}};
 useEffect(()=>{if(!expanded)return;const timer=setTimeout(()=>void load(),250);return()=>{clearTimeout(timer);++request.current;};},[expanded,query]);
 const open=async(id:string)=>{setLoading(true);setError('');recordEvent('catalog_interest','catalog');try{setProfile(await libraryRequest({action:'profile',id}));}catch(e:any){if(e.code==='premium_required')setLocked(id);else setError(e.message);}finally{setLoading(false);}};
 if(!enabled)return null;
 return <section className="my-5 border rounded-2xl p-4 bg-white"><button aria-expanded={expanded} className="min-h-11 text-sm font-bold flex justify-between w-full text-left gap-2" onClick={()=>setExpanded(x=>!x)}>Explore 300 more reference profiles <span className="text-xs text-gray-500">Premium</span></button><p className="text-xs text-gray-500">Your original 300 profiles stay included in Pro.</p>
 {expanded&&<><input aria-label="Search expanded library" placeholder="Search the expanded library" className="w-full border rounded-xl p-3 text-sm mt-3" value={query} onChange={e=>setQuery(e.target.value)}/><div className="mt-3 divide-y">{items.map(item=><button disabled={loading} key={item.id} onClick={()=>void open(item.id)} className="min-h-11 w-full text-left text-sm flex justify-between gap-2 items-center py-2"><span>{item.name}</span><span className="text-xs text-gray-500">Premium ›</span></button>)}</div>{more&&<button disabled={loading} onClick={()=>void load(items.length)} className="min-h-11 underline text-sm">Load more</button>}{loading&&<p role="status" className="text-sm py-3">Loading profiles…</p>}{!loading&&!items.length&&!error&&<p className="text-sm py-3">No matching profiles.</p>}</>}
 {error&&<p role="alert" className="text-red-700 text-sm">{error} <button onClick={()=>void load()} className="min-h-11 underline">Retry</button></p>}
 {profile&&<StrainDetailModal key={profile.id} strain={{...profile.profile,id:profile.id,name:profile.name,type:profile.profile.type || 'Hybrid',thc_level:profile.profile.thc_level || '',most_common_terpene:profile.profile.most_common_terpene || ''} as Strain} onClose={()=>setProfile(null)} onAdd={onAddPlant}/>}
 {locked&&<PremiumPaywall onClose={()=>setLocked(null)} onUnlocked={()=>{const id=locked;setLocked(null);void open(id);}}/>}
 </section>;
}

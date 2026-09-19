import React,{useState} from 'react';
import {recordEvent} from '../services/premiumLibrary';
export default function ProCheckIn({plants,onAddPlant,onOpenJournal,onNavigateToPlant}:any) {
 const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem('mg_checklist_dismissed')==='true';}catch{return false;}});
 const entries=plants.flatMap((p:any)=>(p.journal||[]).map((j:any)=>({...j,plantId:p.id}))).sort((a:any,b:any)=>Date.parse(b.createdAt||b.date)-Date.parse(a.createdAt||a.date));
 const days=new Set(entries.map((j:any)=>{const d=new Date(j.createdAt||j.date);return Number.isNaN(d.getTime())?'':d.toDateString();}).filter(Boolean));
 const complete=[plants.length>0,entries.length>0,days.size>1];
 return <section className="mb-5 space-y-3" aria-label="Your check-ins">
 {!dismissed&&<div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"><div className="flex justify-between items-center"><h2 className="font-bold">Make your first check-in count</h2><button aria-label="Dismiss getting started" className="min-h-11 min-w-11 text-gray-500" onClick={()=>{try{localStorage.setItem('mg_checklist_dismissed','true');}catch{}setDismissed(true);}}>×</button></div>
 {['Add your first plant','Save a note or photo','Return for a follow-up'].map((label,i)=><button key={label} className="min-h-11 flex items-center gap-3 text-sm w-full text-left" onClick={()=>i===0||!plants.length?onAddPlant():onOpenJournal()}><span aria-label={complete[i]?'Complete':'Not completed'} className="text-emerald-700">{complete[i]?'✓':'○'}</span>{label}</button>)}
 <p className="text-xs text-emerald-900">Included in Pro. Your notes make changes easier to remember.</p></div>}
 {entries[0]&&<div className="rounded-2xl border bg-white p-4"><p className="text-xs text-gray-500">Latest saved check-in · {entries[0].date}</p><p className="text-sm line-clamp-2 break-words mt-2">{entries[0].notes||'Photo check-in'}</p><button className="min-h-11 font-bold text-emerald-700 text-sm" onClick={()=>{recordEvent('followup_visit','home');onNavigateToPlant ? onNavigateToPlant(entries[0].plantId) : onOpenJournal();}}>Record an update</button></div>}
 </section>;
}

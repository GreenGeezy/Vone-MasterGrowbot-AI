import React, {useEffect, useState} from 'react';
import { FileText, Camera, BookOpen, RotateCcw } from 'lucide-react';
import Growbot from './Growbot';
import sample from '../data/sampleReport.json';
export default function SampleReport({compact=false}:{compact?:boolean}) {
  const [animation,setAnimation]=useState(0);
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(compact || preference.matches)return;
    setPlaying(true);
    const done=setTimeout(()=>setPlaying(false),2800);
    const stop=()=>{if(preference.matches)setPlaying(false);};
    preference.addEventListener('change',stop);
    return ()=>{clearTimeout(done);preference.removeEventListener('change',stop);};
  },[animation,compact]);
  return <section className={`sample-report ${playing?'sample-playing':''}`} aria-label="Example plant report">
    <div className="sample-photo"><img src="/images/V5MasterGrowbotExamplePlant.jpg" alt="Example plant with yellow lower leaves"/><span>Example report</span>{playing&&<div className="sample-scan" aria-hidden="true"/>}</div>
    <div className="sample-body"><div className="sample-guide"><Growbot size="md" mood={playing?'thinking':'happy'}/><div><strong>From photo to report</strong><p>Illustrative walkthrough · no live analysis</p></div>{!compact&&<button type="button" className="sample-replay" aria-label="Replay example walkthrough" onClick={()=>setAnimation(n=>n+1)}><RotateCcw size={18}/></button>}</div>
    <div className="sample-eyebrow"><FileText size={15}/> PHOTO HEALTH REPORT</div><h2>{sample.diagnosis}</h2><p className="sample-caption">An existing sample analysis. Your plant needs its own assessment.</p>
    {!compact&&<div className="sample-detail"><span>IN THIS EXAMPLE</span><p>Growth stage: {sample.growthStage}</p><p>Reported severity: {sample.severity}</p></div>}
    <div className="sample-flow"><span><Camera size={17}/> Photo</span><span aria-hidden="true">→</span><span><FileText size={17}/> Report</span><span aria-hidden="true">→</span><span><BookOpen size={17}/> Journal</span></div></div></section>;
}

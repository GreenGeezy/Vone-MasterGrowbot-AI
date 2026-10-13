import React, {useEffect, useState} from 'react';
import { FileText, Camera, BookOpen, RotateCcw, Leaf, Lightbulb } from 'lucide-react';
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
  return <section className={`sample-report report-preview ${compact?'report-preview-compact':''} ${playing?'sample-playing':''}`} aria-label="Plant health report preview">
    <div className="sample-photo"><img src="/images/V5MasterGrowbotExamplePlant.jpg" alt="Plant with yellow lower leaves"/><span className="report-example-label">Example</span>{playing&&<div className="sample-scan" aria-hidden="true"/>}</div>
    <div className="sample-body">
      <div className="report-preview-heading"><div><div className="sample-eyebrow"><Leaf size={15}/> PLANT HEALTH</div><h2>{sample.healthLabel}</h2><p className="report-stage">{sample.growthStage} · Low severity</p></div><div className="report-score" style={{'--health-score': `${sample.healthScore}%`} as React.CSSProperties} aria-label={`AI health score ${sample.healthScore} out of 100`}><strong>{sample.healthScore}<small>/100</small></strong><span>AI health score</span></div></div>
      <p className="report-observation">{sample.diagnosis}</p>
      <div className="report-tip"><span className="report-tip-icon"><Lightbulb size={21}/></span><div><strong>YOUR NEXT CHECK</strong><p>{sample.preventionTips[1]}</p></div></div>
      {!compact&&<div className="report-followup"><BookOpen size={18}/><p>Save this report with a photo. Check back to see what changed.</p></div>}
      <div className="sample-guide report-preview-guide"><Growbot size="sm" mood={playing?'thinking':'happy'}/><p>Photo. Clear next checks. Your grow journal.</p>{!compact&&<button type="button" className="sample-replay" aria-label="Replay photo-to-report animation" onClick={()=>setAnimation(n=>n+1)}><RotateCcw size={18}/></button>}</div>
    </div></section>;
}

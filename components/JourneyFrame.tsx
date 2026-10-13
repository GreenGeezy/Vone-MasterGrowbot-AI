import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Growbot from './Growbot';
export default function JourneyFrame({children,title,description,step,onBack,action,onAction,disabled,footer}: {
  children?:React.ReactNode;title:string;description?:string;step?:number;onBack?:()=>void;action?:string;onAction?:()=>void;disabled?:boolean;footer?:React.ReactNode;
}) {
  return <div className="journey-screen" data-testid="journey-screen"><div className="journey-content">
    <header className="journey-topbar">{onBack?<button className="journey-icon" aria-label="Back" onClick={onBack}><ArrowLeft size={20}/></button>:<Growbot size="md"/>}<span className="journey-brand">MasterGrowbot <span>AI</span></span><span className="journey-step">{step?`${step} / 3`:''}</span></header>
    {step&&<div role="progressbar" aria-label="Your preferences" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step} className="journey-progress"><div style={{width:`${step/3*100}%`}}/></div>}
    <main className="journey-main"><h1 tabIndex={-1}>{title}</h1>{description&&<p className="journey-description">{description}</p>}{children}</main>
  </div>{(action||footer)&&<footer className="journey-footer"><div>{action&&<button className="journey-primary" disabled={disabled} onClick={onAction}>{action}<ArrowRight size={19}/></button>}{footer}</div></footer>}</div>;
}

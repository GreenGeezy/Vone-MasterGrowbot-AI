import React, { useEffect, useState } from 'react';
import { Check, Camera, BookOpen, Sprout, Leaf, Award, HelpCircle, Sun, Trees, Warehouse } from 'lucide-react';
import type { UserProfile } from '../types';
import JourneyFrame from '../components/JourneyFrame';
import SampleReport from '../components/SampleReport';
import Growbot from '../components/Growbot';
import PaywallTestimonials from '../components/PaywallTestimonials';
import { answerOnboarding, readOnboarding, writeOnboarding } from '../services/onboardingState';
import { recordEvent } from '../services/conversionEvents';
const QUESTIONS = [
  { key:'onboardingGoal',title:'What’s your growing goal?',description:'What do you want from your next grow?',options:[
    {value:'skills',label:'Get better at growing',detail:'Learn what to look for and what to do next.',icon:Sprout},
    {value:'health',label:'Keep my plants healthy',detail:'Check yellow leaves, pests, and other concerns.',icon:Leaf},
    {value:'size',label:'Grow bigger plants',detail:'Track growth, care, and changes along the way.',icon:Trees},
    {value:'organize',label:'Keep track of my grow',detail:'Keep photos, notes, and reports together.',icon:BookOpen}]},
  { key:'experience',title:'How many grows have you done?',description:'No right answer. We’ll introduce the tools at your pace.',options:[
    {value:'Novice',label:'This is my first grow',detail:'I’m starting out or getting ready.',icon:Sprout},
    {value:'Intermediate',label:'A few grows',detail:'I’ve got the basics. I want to keep improving.',icon:Leaf},
    {value:'Expert',label:'Plenty of grows',detail:'I know my setup and want tools that keep up.',icon:Award}]},
  { key:'grow_mode',title:'Where will you grow?',description:'Choose your setup, or leave it open if you’re still deciding.',options:[
    {value:'Indoor',label:'Indoors',detail:'A tent, room, or other indoor space.',icon:Warehouse},{value:'Outdoor',label:'Outdoors',detail:'An outdoor growing space.',icon:Sun},
    {value:'Greenhouse',label:'Greenhouse',detail:'A greenhouse growing space.',icon:Trees},{value:'not_started',label:'Not started yet',detail:'I’m exploring before I begin.',icon:Sprout}]}
] as const;
export default function Onboarding({onComplete,onRestore,initialStep}:{onComplete:(p:UserProfile)=>void;onRestore?:()=>void;initialStep?:number}) {
  const [draft,setDraft]=useState(()=>{const d=readOnboarding();return {...d,step:initialStep??Math.min(d.step,4)};});
  useEffect(()=>{recordEvent('onboarding_view','onboarding',{step:String(draft.step)});document.querySelector<HTMLElement>('.journey-main h1')?.focus();},[draft.step]);
  const move=(step:number)=>{const d={...draft,step};writeOnboarding(d);setDraft(d);};
  const select=(key:string,value:string)=>{
    const profile=answerOnboarding(draft.profile,key,value);
    const next={...draft,profile};writeOnboarding(next);setDraft(next);recordEvent('onboarding_answer','onboarding',{step:String(draft.step)});
  };
  if(draft.step===0)return <JourneyFrame title="A clearer view of your plant." description="See how a photo report and journal work together." action="See an example" onAction={()=>move(1)} footer={<button className="journey-text-button" onClick={onRestore}>Restore Purchases</button>}>
    <div className="welcome-art"><Growbot size="xl"/><span className="welcome-caption">A photo. A report. A place to keep it.</span></div><SampleReport compact/><PaywallTestimonials/>
  </JourneyFrame>;
  if(draft.step===1)return <JourneyFrame title="Know what to check next." description="A health score, useful next checks, and a shareable report." onBack={()=>move(0)} action="Make it yours" onAction={()=>move(2)}><SampleReport/></JourneyFrame>;
  const question=QUESTIONS[Math.min(draft.step-2,2)];
  const selected=question.key==='grow_mode'&&draft.profile.growSetupUndecided?'not_sure'
    :question.key==='grow_mode'&&draft.profile.notStartedYet?'not_started'
    :question.key==='experience'&&draft.profile.experienceUndecided?'not_sure':draft.profile[question.key];
  const unsureValue=question.key==='onboardingGoal'?'explore':'not_sure';
  return <JourneyFrame title={question.title} description={question.description} step={draft.step-1} onBack={()=>move(draft.step-1)} action="Continue" disabled={!selected} onAction={()=>{
    if(draft.step<4)move(draft.step+1);else {const profile={...draft.profile,experience:draft.profile.experience||'Novice'} as UserProfile;writeOnboarding({...draft,profile,step:5});onComplete(profile);}
  }}><div className="journey-options">{question.options.map(option=>{
    const Icon='icon' in option?option.icon:null;
    return <button type="button" key={option.value} aria-pressed={selected===option.value} className={`journey-option ${selected===option.value?'is-selected':''}`} onClick={()=>select(question.key,option.value)}>{Icon&&<span className="journey-option-icon"><Icon size={22}/></span>}<span className="journey-option-copy"><strong>{option.label}</strong><span>{option.detail}</span></span><span className="journey-radio">{selected===option.value&&<Check size={15}/>}</span></button>;
  })}<button type="button" aria-pressed={selected===unsureValue} className={`journey-unsure ${selected===unsureValue?'is-selected':''}`} onClick={()=>select(question.key,unsureValue)}><HelpCircle size={18} aria-hidden="true"/><span>{question.key==='onboardingGoal'?'Not sure yet. Let me explore':'Not sure yet'}</span>{selected===unsureValue&&<Check size={17}/>}</button></div><p className="journey-note">Just a starting point. You can change your preferences and explore the other tools later.</p><PaywallTestimonials/></JourneyFrame>;
}

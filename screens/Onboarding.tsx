import React, { useEffect, useState } from 'react';
import { Check, Camera, BookOpen, Sprout, Leaf, Award, HelpCircle, Sun, Trees, Warehouse } from 'lucide-react';
import type { UserProfile } from '../types';
import JourneyFrame from '../components/JourneyFrame';
import SampleReport from '../components/SampleReport';
import Growbot from '../components/Growbot';
import PaywallTestimonials from '../components/PaywallTestimonials';
import { answerOnboarding, readOnboarding, writeOnboarding } from '../services/onboardingState';
import { recordEvent } from '../services/premiumLibrary';
const QUESTIONS = [
  { key:'onboardingGoal',title:'What’s your growing goal?',description:'Choose what matters most. We’ll suggest a useful place to start.',options:[
    {value:'skills',label:'Become a better grower',detail:'Build my knowledge and learn from each check-in.',icon:Sprout},
    {value:'health',label:'Grow healthier plants',detail:'Understand visible signs and what to check next.',icon:Leaf},
    {value:'quality',label:'Improve my grow’s quality',detail:'Keep observations and follow-ups together.',icon:Award},
    {value:'organize',label:'Keep my grow organized',detail:'Save photos, notes, and reports in one place.',icon:BookOpen}]},
  { key:'experience',title:'How familiar are you with growing?',description:'No right answer. We’ll introduce the tools at your pace.',options:[
    {value:'Novice',label:'Getting started',detail:'I’m planning or learning my first grow.',icon:Sprout},
    {value:'Intermediate',label:'Some experience',detail:'I know the basics and want to build on them.',icon:Leaf},
    {value:'Expert',label:'Experienced',detail:'I want useful tools and organized records.',icon:Award}]},
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
  if(draft.step===1)return <JourneyFrame title="Here’s what a report looks like." description="An existing sample, so you can see the experience before choosing a subscription." onBack={()=>move(0)} action="Make it yours" onAction={()=>move(2)}><SampleReport/></JourneyFrame>;
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
  })}<button type="button" aria-pressed={selected===unsureValue} className={`journey-unsure ${selected===unsureValue?'is-selected':''}`} onClick={()=>select(question.key,unsureValue)}><HelpCircle size={18} aria-hidden="true"/><span>{question.key==='onboardingGoal'?'Not sure yet — let me explore':'Not sure yet'}</span>{selected===unsureValue&&<Check size={17}/>}</button></div><p className="journey-note">Just a starting point. You can change your preferences and explore the other tools later.</p><PaywallTestimonials/></JourneyFrame>;
}

import React, { useEffect, useState } from 'react';
import { Camera, BookOpen, Dna, Share2, Check } from 'lucide-react';
import JourneyFrame from '../components/JourneyFrame';
import Growbot from '../components/Growbot';
export const TUTORIAL_VERSION = 1;

const steps = [
  {title:'Turn a photo into next checks.',description:'Open Plant Health and choose a clear plant photo. Add your strain and setup, then review the AI’s observations and suggested checks.',icon:Camera,items:['Use a well-lit photo with the affected area visible.','Read the priority action and supporting details.','Save the report to your plant’s journal.']},
  {title:'Build your grow record.',description:'Keep photos and notes for each plant in Journal. Add tasks for the care you want to remember.',icon:BookOpen,items:['Add a plant from the strain library.','Save a short note about what changed.','Come back for a follow-up and compare your records.']},
  {title:'Get to know your strain.',description:'Open Strains to search your included reference library. Use it alongside your own observations as your grow develops.',icon:Dna,items:['Search by strain name or browse the library.','Read the available growing information.','Add the strain to start a plant record.']},
  {title:'Invite a second look.',description:'Your plant health reports are shareable. Tap Share Analysis to preview your card and choose where to share it.',icon:Share2,items:['Review the card before sharing.','Choose whether to include your plant photo.','Return to Home for your plants, tasks, and check-ins.']},
];
export default function GetStartedTutorial({onComplete}:{onComplete:()=>void}) {
  const [step,setStep]=useState(0);
  const current=steps[step];const Icon=current.icon;
  useEffect(()=>{document.querySelector<HTMLElement>('.journey-main h1')?.focus();},[step]);
  return <JourneyFrame key={step} title={current.title} description={current.description} onBack={step?()=>setStep(value=>value-1):undefined} action={step===steps.length-1?'Open my dashboard':'Next'} onAction={()=>step===steps.length-1?onComplete():setStep(value=>value+1)} footer={<button className="journey-text-button" onClick={onComplete}>Skip tutorial</button>}>
    <div className="tutorial-progress" role="progressbar" aria-label="Getting started" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step+1}><span style={{width:`${(step+1)/steps.length*100}%`}}/></div>
    <p className="tutorial-step">{step+1} of {steps.length}</p>
    <div className="tutorial-art" aria-hidden="true"><Growbot size="xl" mood="happy"/><span><Icon size={38}/></span></div>
    <ul className="tutorial-tips">{current.items.map(item=><li key={item}><Check size={18} aria-hidden="true"/><span>{item}</span></li>)}</ul>
    <p className="journey-note">Replay this guide anytime in Profile → Settings & Support → View Tutorial.</p>
  </JourneyFrame>;
}

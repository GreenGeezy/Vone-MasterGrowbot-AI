import React from 'react';
import { Camera, BookOpen, Sprout } from 'lucide-react';
import type { UserProfile } from '../types';
import JourneyFrame from '../components/JourneyFrame';
import Growbot from '../components/Growbot';
import PaywallTestimonials from '../components/PaywallTestimonials';
import { growerBenefits } from '../services/growerBenefits';
import { firstActionDetails, goalDetails } from '../services/onboardingState';
export default function OnboardingSummary({profile,onContinue,onEdit}:{profile:UserProfile;onContinue:()=>void;onEdit?:(step:number)=>void}) {
  const benefits=growerBenefits(profile);
  const goal=goalDetails(profile);
  const intent=profile.onboardingIntent||'photo';
  const destination=firstActionDetails(profile).title;
  const Icon=intent==='journal'?BookOpen:['references','learn','explore'].includes(intent)?Sprout:Camera;
  return <JourneyFrame title={goal?"Your goal. Your next step.":"Your starting point."} description={goal?.description || benefits.summary} onBack={()=>onEdit?.(4)} action="See Pro options" onAction={onContinue}>
    {goal&&<section className="summary-goal"><span className="sample-eyebrow">YOUR GROWING GOAL</span><h2>{goal.title}</h2><div className="goal-path" aria-label="Suggested workflow"><span>Explore</span><span>Check in</span><span>Keep a record</span></div></section>}<div className="summary-mascot"><Growbot size="lg" mood="happy"/></div><section className="summary-next"><span className="sample-eyebrow">YOUR FIRST ACTION</span><Icon size={30}/><h2>{destination}</h2><p>Available after your Pro access is confirmed.</p></section>
    <div className="summary-preferences">{[
      ['Goal',goal?.title || 'Explore the tools',2],
      ['Start with',intent==='learn'?'Learn as I grow':intent==='explore'?'Explore the tools':intent==='journal'?'Grow journal':intent==='references'?'Strain references':'Plant photo',2],
      ['Experience',profile.experienceUndecided?'Not sure yet':profile.experience==='Novice'?'Getting started':profile.experience==='Intermediate'?'Some experience':'Experienced',3],
      ['Environment',profile.growSetupUndecided?'Not sure yet':profile.notStartedYet?'Not started yet':profile.grow_mode||'Not selected',4]
    ].map(([label,value,step])=><div key={label}><span><small>{label}</small><strong>{value}</strong></span>{onEdit&&<button className="journey-text-button" aria-label={`Edit ${String(label).toLowerCase()}`} onClick={()=>onEdit(Number(step))}>Edit</button>}</div>)}</div>
    <p className="journey-note">These are your preferences. A plant assessment starts with a real photo.</p>
    <PaywallTestimonials/>
  </JourneyFrame>;
}

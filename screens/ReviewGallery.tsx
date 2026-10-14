import React, {useState} from 'react';
import Onboarding from './Onboarding';
import GetStartedTutorial from './GetStartedTutorial';
import LaunchScreen from '../components/LaunchScreen';
import OnboardingSummary from './OnboardingSummary';
import Paywall from './Paywall';
import PremiumPaywall from './PremiumPaywall';
import Home from './Home';
import Journal from './Journal';
import StrainSearch from './StrainSearch';
import JourneyFrame from '../components/JourneyFrame';
import SampleReport from '../components/SampleReport';
import Growbot from '../components/Growbot';
import Diagnose from './Diagnose';
import sample from '../data/sampleReport.json';
import {writeOnboarding} from '../services/onboardingState';
import type {UserProfile} from '../types';


const screens=[
 ['welcome','Welcome','A concrete example establishes value before the subscription decision.'],
 ['sample','Sample report','Real sample content makes the experience easier to understand.'],
 ['intent','First action','A relevant starting point makes the first session useful.'],
 ['experience','Experience','Short questions replace repeated introductory slides.'],
 ['environment','Environment','Save preferences without promising a generated plan.'],
 ['summary','Starting point','Editable choices explain what happens after subscribing.'],
 ['pro','Pro subscription','Clear pricing, benefits, and restoration support an informed purchase.'],
 ['tutorial','Tutorial','A short replayable guide helps subscribers use their tools.'],
 ['launch','Launch screen','A branded first paint covers application startup.'],
 ['first','First check-in','Go straight to the selected activity after verified access.'],
 ['report','Report','A clear save action supports an ongoing journal habit.'],
 ['journal','Journal','Readable history and a clear next action support return visits.'],
 ['references','References','Included references remain available; Premium is an optional expansion.'],
 ['premium','Premium subscription','Explain additional features after a relevant user action.'],
 ['recovery','Recovery','Honest errors and retained drafts protect trust and successful saves.']
];
function Preview({name}:{name:string}) {
 const level=new URLSearchParams(location.search).get('experience');
 const [profile,setProfile]=useState<UserProfile>({experience:level==='Expert'?'Expert':level==='Intermediate'?'Intermediate':'Novice',grow_mode:'Indoor',onboardingIntent:'photo',onboardingGoal:'health'});
 const [screen,setScreen]=useState(name);
 const [plants,setPlants]=useState<any[]>([{id:'preview-plant',name:'My plant',strain:'Example plant',imageUri:'/images/V5MasterGrowbotExamplePlant.jpg',journal:[{id:'preview-entry',date:'Oct 12, 2026',createdAt:'2026-10-12T12:00:00Z',type:'note',notes:'Saved a photo check-in. Keeping this report with my notes.',imageUri:'/images/V5MasterGrowbotExamplePlant.jpg'}]}]);
 const [hint,setHint]=useState(true);
 const next=(n:string)=>setScreen(n);
 if(['welcome','sample','intent','experience','environment'].includes(screen))return <Onboarding key={screen} initialStep={['welcome','sample','intent','experience','environment'].indexOf(screen)} onComplete={p=>{setProfile(p);next('summary');}} onRestore={()=>next('pro')}/>;
 if(screen==='tutorial')return <GetStartedTutorial onComplete={()=>next('first')}/>;
 if(screen==='launch')return <LaunchScreen/>;
 if(screen==='summary')return <OnboardingSummary profile={profile} onContinue={()=>next('pro')} onEdit={s=>next(['welcome','sample','intent','experience','environment'][s])}/>;
 if(screen==='pro')return <Paywall profile={profile} onPurchase={()=>next('first')} onClose={()=>next('summary')} onSkip={()=>next('summary')}/>;
 if(screen==='premium')return <PremiumPaywall profile={profile} onClose={()=>next('journal')} onUnlocked={()=>next('journal')}/>;
 if(screen==='report')return <><div className="bg-purple-50 text-purple-900 text-xs p-3 font-semibold">Example report · existing sample · no live analysis</div><Diagnose previewResult={sample as any} previewImage="/images/V5MasterGrowbotExamplePlant.jpg" defaultProfile={profile} plant={plants[0]} onSaveToJournal={()=>{next('journal');return true;}} onAddTask={()=>true}/></>;
 if(screen==='journal')return <Journal plants={plants} tasks={[]} onAddPlant={()=>next('references')} onAddEntry={async(e:any)=>{setPlants(p=>p.map(x=>({...x,journal:[{...e,id:crypto.randomUUID(),date:new Date().toLocaleDateString()},...x.journal]})));return true;}} onAddTask={async()=>true}/>;
 if(screen==='references')return <StrainSearch onAddPlant={()=>next('journal')}/>;
 if(screen==='recovery')return <JourneyFrame title="Your draft is still here." description="We couldn’t save this change. Check your connection and try again." action="Try again" onAction={()=>next('journal')}><div className="summary-next" role="alert"><Growbot mood="neutral" size="lg"/><h2>Nothing to re-enter.</h2><p>When a save fails, the editor keeps your note and selected photo available.</p></div></JourneyFrame>;
 return <div>{hint&&<div className="p-4 bg-emerald-50 flex gap-3 items-center"><p className="text-sm flex-1">Start with your first check-in. Your tools are ready.</p><button className="min-h-11 font-bold" onClick={()=>setHint(false)}>Got it</button></div>}<Home plants={plants} tasks={[]} onCheckPhoto={()=>next('report')} onAddPlant={()=>next('references')} onOpenJournal={()=>next('journal')} onNavigateToPlant={()=>next('journal')}/></div>;
}
export default function ReviewGallery() {
 const params=new URLSearchParams(location.search);const name=params.get('screen')||'welcome';
 const [index,setIndex]=useState(Math.max(0,screens.findIndex(x=>x[0]===name)));
 const [experience,setExperience]=useState('Novice');
 const [width,setWidth]=useState(402);const [largeText,setLargeText]=useState(false);
 if(location.pathname==='/review/screen')return <Preview name={name}/>;
 const select=(i:number)=>{setIndex(i);writeOnboarding({version:2,step:0,profile:{},completed:false});};
 return <div className="review-gallery"><aside><span className="review-badge">LOCAL DESIGN REVIEW · NO CHARGES</span><h1>MasterGrowbot<br/>Your next iOS experience.</h1><p>Review each screen in order. Subscription prices here are preview fixtures; Apple supplies the real localized prices in the iOS app.</p><nav aria-label="Review screens">{screens.map(([key,label],i)=><button key={key} aria-current={i===index?'step':undefined} onClick={()=>select(i)}><span>{String(i+1).padStart(2,'0')}</span>{label}</button>)}</nav><label>Grower experience <select value={experience} onChange={e=>setExperience(e.target.value)}><option value="Novice">Getting started</option><option value="Intermediate">Some experience</option><option value="Expert">Experienced</option></select></label><label>iPhone layout <select value={width} onChange={e=>setWidth(Number(e.target.value))}>{[375,390,393,402,414,430,440].map(w=><option key={w} value={w}>{w} points wide</option>)}</select></label><label className="review-checkbox"><input type="checkbox" checked={largeText} onChange={e=>setLargeText(e.target.checked)}/> Larger text preview</label><p className="review-reason">{screens[index][2]}</p><div className="review-navigation"><button disabled={index===0} onClick={()=>select(index-1)}>Previous</button><button disabled={index===screens.length-1} onClick={()=>select(index+1)}>Next screen →</button></div></aside><div className="review-stage"><div className="review-phone" style={{width}}><iframe key={`${index}-${largeText}-${experience}`} title={`${screens[index][1]} iPhone preview`} src={`/review/screen?screen=${screens[index][0]}${largeText?'&text=large':''}&experience=${experience}`} style={{width,height:874}}/></div></div></div>;
}

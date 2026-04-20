import React, { useState } from 'react';
import OnboardingWelcome from './OnboardingWelcome';
import ExperienceLevel from './ExperienceLevel';
import GrowingGoals from './GrowingGoals';
import PainPoints from './PainPoints';
import SocialProof from './SocialProof';
import PersonalizedSolution from './PersonalizedSolution';
import GrowSetup from './GrowSetup';
import CameraPermission from './CameraPermission';
import LiveScanDemo from './LiveScanDemo';
import ScanResults from './ScanResults';
import CongratsReview from './CongratsReview';
import OnboardingPaywall from './OnboardingPaywall';

export type OnboardingScreen =
  | 'welcome'        // 0
  | 'experience'     // 1
  | 'goals'          // 2
  | 'pain_points'    // 3
  | 'social_proof'   // 4
  | 'solution'       // 5
  | 'grow_setup'     // 6
  | 'camera_perm'    // 7
  | 'scan_demo'      // 8
  | 'scan_results'   // 9
  | 'congrats'       // 10
  | 'paywall';       // 11

interface OnboardingData {
  experience: string;
  goal: string;
  painPoints: string[];
  environment: string;
  medium: string;
  lighting: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [screen, setScreen] = useState<OnboardingScreen>('welcome');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanImage, setScanImage] = useState<string>('');

  const [data, setData] = useState<OnboardingData>({
    experience: '',
    goal: '',
    painPoints: [],
    environment: '',
    medium: '',
    lighting: '',
  });

  const update = (partial: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...partial }));

  const saveAndContinue = (finalData: OnboardingData) => {
    // Persist onboarding answers to localStorage for App.tsx to read
    localStorage.setItem('mg_onboarding_experience', finalData.experience);
    localStorage.setItem('mg_onboarding_goal', finalData.goal);
    localStorage.setItem('mg_onboarding_pain_points', JSON.stringify(finalData.painPoints));
    localStorage.setItem('mg_onboarding_environment', finalData.environment);
    localStorage.setItem('mg_onboarding_medium', finalData.medium);
    localStorage.setItem('mg_onboarding_lighting', finalData.lighting);
    onComplete(finalData);
  };

  switch (screen) {
    case 'welcome':
      return (
        <OnboardingWelcome
          onGetStarted={() => setScreen('experience')}
        />
      );

    case 'experience':
      return (
        <ExperienceLevel
          onNext={(level) => {
            update({ experience: level });
            setScreen('goals');
          }}
        />
      );

    case 'goals':
      return (
        <GrowingGoals
          onNext={(goal) => {
            update({ goal });
            setScreen('pain_points');
          }}
          onBack={() => setScreen('experience')}
        />
      );

    case 'pain_points':
      return (
        <PainPoints
          onNext={(painPoints) => {
            update({ painPoints });
            setScreen('social_proof');
          }}
          onBack={() => setScreen('goals')}
        />
      );

    case 'social_proof':
      return (
        <SocialProof
          onNext={() => setScreen('solution')}
          onBack={() => setScreen('pain_points')}
        />
      );

    case 'solution':
      return (
        <PersonalizedSolution
          painPoints={data.painPoints}
          goal={data.goal}
          experienceLevel={data.experience}
          onNext={() => setScreen('grow_setup')}
          onBack={() => setScreen('social_proof')}
        />
      );

    case 'grow_setup':
      return (
        <GrowSetup
          onNext={(setupData) => {
            update({ environment: setupData.environment, medium: setupData.medium, lighting: setupData.lighting });
            setScreen('camera_perm');
          }}
          onBack={() => setScreen('solution')}
        />
      );

    case 'camera_perm':
      return (
        <CameraPermission
          onPermissionGranted={() => setScreen('scan_demo')}
          onSkip={() => setScreen('congrats')}
          onBack={() => setScreen('grow_setup')}
        />
      );

    case 'scan_demo':
      return (
        <LiveScanDemo
          onboardingContext={{
            experience: data.experience,
            goal: data.goal,
            environment: data.environment,
            medium: data.medium,
            lighting: data.lighting,
          }}
          onScanComplete={(result, imageDataUrl) => {
            setScanResult(result);
            setScanImage(imageDataUrl);
            setScreen('scan_results');
          }}
          onSkip={() => setScreen('congrats')}
          onBack={() => setScreen('camera_perm')}
        />
      );

    case 'scan_results':
      return (
        <ScanResults
          result={scanResult}
          imageDataUrl={scanImage}
          onNext={() => setScreen('congrats')}
        />
      );

    case 'congrats':
      return (
        <CongratsReview
          onNext={() => setScreen('paywall')}
          experienceLevel={data.experience}
          scanImage={scanImage}
        />
      );

    case 'paywall':
      return (
        <OnboardingPaywall
          onPurchase={() => saveAndContinue(data)}
        />
      );

    default:
      return null;
  }
};

export default OnboardingFlow;

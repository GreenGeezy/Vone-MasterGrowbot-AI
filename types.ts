export enum PlantStage {
  SEEDLING = 'Seedling',
  VEG = 'Vegetative',
  FLOWER_EARLY = 'Early Flower',
  FLOWER_LATE = 'Late Flower',
  HARVEST = 'Harvest Ready'
}

export interface Strain {
  id?: string;
  name: string;
  type: 'Indica' | 'Sativa' | 'Hybrid';
  thc_level: string;
  most_common_terpene: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date?: string;
  type?: 'water' | 'feed' | 'check' | 'train';
}

export interface DiagnosisResult {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  health?: number; 
  confidence: number;
  fixSteps: string[];
  topAction?: string;
  yieldTips?: string; 
  qualityTips?: string; 
}

export interface JournalEntry {
  id: string;
  date: string;
  type: 'note' | 'diagnosis' | 'chat' | 'water' | 'feed';
  title?: string;
  notes?: string;
  image?: string; 
  imageUri?: string;
  drawingUri?: string;
  result?: DiagnosisResult;
  aiAnalysis?: { summary: string };
}

export interface Plant {
  id: string;
  name: string;
  strain: string; 
  strainDetails?: Strain;
  stage: PlantStage | string; 
  age_days?: number; 
  totalDays?: number;
  healthScore: number;
  imageUri: string;
  tasks?: Task[];
  journal: JournalEntry[];
  activeAlerts?: ('thirsty' | 'pest' | 'nutrient' | 'env')[];
}

export interface UserProfile {
  id?: string; 
  experience: 'Novice' | 'Intermediate' | 'Expert' | 'Pro'; 
}

export enum OnboardingStep {
  SPLASH = 'SPLASH', 
  QUIZ_EXPERIENCE = 'QUIZ_EXPERIENCE',
  SUMMARY = 'SUMMARY',
  COMPLETED = 'COMPLETED'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  content?: string;
  timestamp?: number;
}

// FIX: Added missing AppScreen enum
export enum AppScreen {
  HOME = 'home',
  JOURNAL = 'journal',
  DIAGNOSE = 'diagnose',
  CHAT = 'chat',
  PAYWALL = 'paywall',
  PROFILE = 'profile'
}


export enum PlantStage {
  SEEDLING = 'Seedling',
  VEG = 'Vegetative',
  FLOWER_EARLY = 'Early Flower',
  FLOWER_LATE = 'Late Flower',
  HARVEST = 'Harvest Ready'
}

export interface Strain {
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
  type: 'water' | 'feed' | 'check' | 'train';
}

export type JournalEntryType = 'note' | 'diagnosis' | 'chat';

export interface LogAnalysis {
  summary: string;
  yieldPrediction?: string; // e.g. "Yield on track (+5%)"
  healthIndicator?: 'good' | 'concern' | 'critical';
  detectedValues?: {
    ph?: number;
    ppm?: number;
    temp?: number;
  }
}

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  title: string;
  notes?: string; // User notes or Chat answer
  originalQuestion?: string; // For chat logs
  imageUri?: string; // For photos
  drawingUri?: string; // For user sketches
  diagnosisData?: DiagnosisResult; // For diagnosis logs
  envTemp?: number;
  envHumidity?: number;
  tags?: ('water' | 'feed' | 'prune' | 'env' | 'photo')[];
  aiAnalysis?: LogAnalysis;
  // Sharing properties
  isPublic?: boolean;
  publicUrl?: string;
}

export interface WeeklySummary {
  id: string;
  weekNumber: number;
  imageUri: string;
  healthScore: number;
  aiNotes: string; // The AI generated summary for that week
  date: string;
}

export interface Plant {
  id: string;
  name: string;
  strain: string; 
  strainDetails?: Strain; // Populated from strain database
  stage: PlantStage;
  daysInStage: number;
  totalDays: number;
  healthScore: number;
  imageUri: string;
  nextHarvestDate: string;
  streak: number;
  tasks: Task[];
  journal: JournalEntry[];
  weeklySummaries: WeeklySummary[]; // History for the cards
  activeAlerts?: ('thirsty' | 'pest' | 'nutrient' | 'env')[]; // Indicators for the dashboard
}

export interface DiagnosisResult {
  issues: string[];
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  health: 'Poor' | 'Fair' | 'Good' | 'Great' | 'Excellent';
  stage: string;
  topAction: string;
  fixSteps: string[];
  diagnosis: string;
  yieldTips: string[];
  qualityTips: string[];
  generalAdvice: string;
}

export enum AppScreen {
  HOME = 'home',
  JOURNAL = 'journal',
  DIAGNOSE = 'diagnose',
  CHAT = 'chat',
  PAYWALL = 'paywall',
  ACCOUNT = 'account'
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

// --- Onboarding & User Profile ---

export interface UserProfile {
  experience: 'Novice' | 'Intermediate' | 'Expert';
  grow_mode: 'Indoor' | 'Outdoor' | 'Greenhouse';
  goal: 'Maximize Yield' | 'Improve Quality' | 'Learn Skills';
  space: 'Small' | 'Medium' | 'Large';
}

export enum OnboardingStep {
  SPLASH = 'splash',
  QUIZ = 'quiz',
  SUMMARY = 'summary',
  TRIAL_PAYWALL = 'trial_paywall',
  COMPLETED = 'completed'
}
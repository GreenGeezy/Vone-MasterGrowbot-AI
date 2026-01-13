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
  yieldPrediction?: string; 
  healthIndicator?: 'good' | 'concern' | 'critical';
  detectedValues?: {
    ph?: number;
    ppm?: number;
    temp?: number;
  }
}

export interface DiagnosisResult {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  health: number; // Changed from String to Number (0-100) for the new UI
  confidence: number;
  fixSteps: string[];
  // Optional fields for backward compatibility or future expansion
  issues?: string[];
  stage?: string;
  topAction?: string;
  yieldTips?: string[];
  qualityTips?: string[];
  generalAdvice?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  title: string;
  notes?: string;
  originalQuestion?: string;
  imageUri?: string;
  drawingUri?: string;
  diagnosisData?: DiagnosisResult;
  envTemp?: number;
  envHumidity?: number;
  tags?: ('water' | 'feed' | 'prune' | 'env' | 'photo')[];
  aiAnalysis?: LogAnalysis;
  isPublic?: boolean;
  publicUrl?: string;
}

export interface WeeklySummary {
  id: string;
  weekNumber: number;
  imageUri: string;
  healthScore: number;
  aiNotes: string;
  date: string;
}

export interface Plant {
  id: string;
  name: string;
  strain: string; 
  strainDetails?: Strain;
  stage: PlantStage;
  daysInStage: number;
  totalDays: number;
  healthScore: number;
  imageUri: string;
  nextHarvestDate: string;
  streak: number;
  tasks: Task[];
  journal: JournalEntry[];
  weeklySummaries: WeeklySummary[];
  activeAlerts?: ('thirsty' | 'pest' | 'nutrient' | 'env')[];
}

export enum AppScreen {
  HOME = 'home',
  JOURNAL = 'journal',
  DIAGNOSE = 'diagnose',
  CHAT = 'chat',
  PAYWALL = 'paywall',
  ACCOUNT = 'account'
}

// UPDATED: Matches the new Chat.tsx structure
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system'; // Changed from isUser boolean
  content: string; // Changed from text
  timestamp: Date | number;
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
  POST_PAYMENT_AUTH = 'post_payment_auth',
  COMPLETED = 'completed'
}

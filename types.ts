// types.ts

export enum PlantStage {
  SEEDLING = 'Seedling',
  VEG = 'Vegetative',
  FLOWER_EARLY = 'Early Flower',
  FLOWER_LATE = 'Late Flower',
  HARVEST = 'Harvest Ready'
}

// UPDATED: Added 'id' field required by the new Strain Database logic
export interface Strain {
  id?: string; // Optional for backward compatibility, but recommended for DB
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
  date?: string; // Added date for calendar tracking
  type: 'water' | 'feed' | 'check' | 'train';
}

export type JournalEntryType = 'note' | 'diagnosis' | 'chat' | 'water' | 'feed';

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
  health?: number; // 0-100 Score
  healthy?: boolean; // Boolean flag for quick checks
  confidence: number;
  fixSteps: string[];
  
  // Extended fields for the new UI
  topAction?: string;
  yieldTips?: string; // Changed to string to match Gemini output
  qualityTips?: string; // Changed to string to match Gemini output
  
  // Legacy fields
  issues?: string[];
  stage?: string;
  generalAdvice?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  title?: string;
  notes?: string;
  originalQuestion?: string;
  image?: string; // Unified: new code uses 'image', old used 'imageUri'
  imageUri?: string; // Kept for backward compatibility
  drawingUri?: string;
  
  diagnosisData?: DiagnosisResult; // Legacy structure
  result?: DiagnosisResult; // Unified: new code uses 'result'
  diagnosis?: string; // Simple text summary
  
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
  stage: PlantStage | string; // Allow string for flexibility
  daysInStage?: number;
  age_days?: number; // Unified: new code uses 'age_days'
  totalDays?: number;
  healthScore: number;
  health_score?: number; // Alias for consistency
  imageUri: string;
  nextHarvestDate?: string;
  streak?: number;
  tasks?: Task[];
  journal: JournalEntry[];
  weeklySummaries?: WeeklySummary[];
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'model'; // Added 'model' for Gemini compatibility
  content: string; // Unified text content
  text?: string; // Alias for backward compatibility
  timestamp: Date | number;
}

// --- Onboarding & User Profile ---

export interface UserProfile {
  id?: string; // Added for database linkage
  email?: string;
  experience: 'Novice' | 'Intermediate' | 'Expert' | 'Pro'; // Added 'Pro' matching new UI
  grow_mode?: 'Indoor' | 'Outdoor' | 'Greenhouse';
  environment?: 'Indoor' | 'Outdoor' | 'Greenhouse'; // Alias
  goal?: 'Maximize Yield' | 'Improve Quality' | 'Learn Skills';
  space?: 'Small' | 'Medium' | 'Large';
  notifications_enabled?: boolean;
}

export enum OnboardingStep {
  SPLASH = 'SPLASH', // Standardized to Uppercase as per your new App.tsx
  QUIZ_EXPERIENCE = 'QUIZ_EXPERIENCE',
  SUMMARY = 'SUMMARY',
  TRIAL_PAYWALL = 'TRIAL_PAYWALL',
  POST_PAYMENT_AUTH = 'POST_PAYMENT_AUTH',
  COMPLETED = 'COMPLETED'
}

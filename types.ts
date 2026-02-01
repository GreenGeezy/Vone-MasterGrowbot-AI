// --- Enums & Constants ---

export enum PlantStage {
  SEEDLING = 'Seedling',
  VEG = 'Vegetative',
  FLOWER_EARLY = 'Early Flower',
  FLOWER_LATE = 'Late Flower',
  HARVEST = 'Harvest Ready'
}

export enum AppScreen {
  HOME = 'home',
  JOURNAL = 'journal',
  DIAGNOSE = 'diagnose',
  CHAT = 'chat',
  PAYWALL = 'paywall',
  ACCOUNT = 'account',
  PROFILE = 'profile'
}

export enum OnboardingStep {
  SPLASH = 'splash',
  QUIZ = 'quiz',
  QUIZ_EXPERIENCE = 'quiz_experience',
  SUMMARY = 'summary',
  TRIAL_PAYWALL = 'trial_paywall',
  POST_PAYMENT_AUTH = 'post_payment_auth',
  COMPLETED = 'completed'
}

// --- Core Data Structures ---

export interface Strain {
  id?: string;
  name: string;
  type: 'Indica' | 'Sativa' | 'Hybrid';
  thc_level: string;
  most_common_terpene: string;
  description: string;
}

export interface GrowTask {
  id: string;
  plantId?: string; // Optional for now to support global tasks
  title: string;
  completed: boolean; // Keeping 'completed' for backward compat, or I can map it. 
  // Wait, prompt asked for 'isCompleted'. I should add that and maybe keep 'completed' as legacy or refactor.
  // Prompt: isCompleted, source, createdAt.
  isCompleted: boolean;
  dueDate: string; // ISO string
  source: 'user' | 'ai_diagnosis';
  createdAt: string;
  type?: 'water' | 'feed' | 'check' | 'train' | 'other'; // Keep for legacy compatibility
  recurrence?: 'daily' | 'weekly';
  notes?: string;
}

export type Task = GrowTask; // Alias for backward compatibility

// --- AI Analysis & Diagnosis ---

export interface DiagnosisResult {
  // Core Identity
  diagnosis: string;         // e.g. "Nitrogen Deficiency"
  confidence: number;        // 0-100

  // Health Metrics
  severity: 'low' | 'medium' | 'high';
  healthScore: number;       // 0-100 (For UI Gauge)
  healthLabel?: 'Struggling' | 'Poor' | 'Suboptimal' | 'Average' | 'Good' | 'Great' | 'Thriving' | 'Excellent'; // (For Text Badge)
  growthStage: string;       // e.g. "Vegetative"

  // Actionable Advice
  topAction: string;         // The #1 priority
  fixSteps: string[];        // Step-by-step cure

  // Advanced Optimization (New Gemini 3 Features)
  yieldTips: string[];       // How to get more weight
  qualityTips: string[];     // How to get better terps/thc
  generalAdvice?: string;    // Contextual summary
  environmentSummary?: string; // e.g. "Light Stress Detected" or "Optimal Climate"
}

export interface LogAnalysis {
  summary: string;
  yieldPrediction?: string; // e.g. "Yield on track (+5%)"
  healthIndicator?: 'good' | 'concern' | 'critical';
  detectedValues?: {
    ph?: number;
    ppm?: number;
    temp?: number;
    humidity?: number;
  }
}

// --- Journal & Logs ---

export type JournalEntryType = 'note' | 'diagnosis' | 'chat' | 'water' | 'feed';

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  title: string;

  // Content
  notes?: string;
  originalQuestion?: string; // If this came from Chat

  // Media
  imageUri?: string;
  drawingUri?: string;

  // Data Points
  diagnosisData?: DiagnosisResult;
  envTemp?: number;
  envHumidity?: number;
  tags?: ('water' | 'feed' | 'prune' | 'env' | 'photo' | 'training')[];

  // AI Insights
  aiAnalysis?: LogAnalysis;

  // Social
  isPublic?: boolean;
  publicUrl?: string;
}

export interface WeeklySummary {
  id: string;
  weekNumber: number;
  imageUri: string;
  healthScore: number;
  aiNotes: string; // "Week 4 Summary: Great stretch, nitrogen levels look good."
  date: string;
}

// --- Main Entities ---

export interface Plant {
  id: string;
  name: string;
  strain: string;
  strainDetails?: Strain;

  // Timing
  stage: PlantStage | string;
  daysInStage: number;
  totalDays: number;
  nextHarvestDate?: string;

  // Health & Stats
  healthScore: number;
  imageUri: string;
  streak: number; // Gamification: Consecutive days logged

  // Collections
  tasks: Task[];
  journal: JournalEntry[];
  weeklySummaries: WeeklySummary[]; // History cards
  activeAlerts?: ('thirsty' | 'pest' | 'nutrient' | 'env')[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant'; // Standardized for Gemini API
  content: string;            // The message text
  timestamp: number;
  isVoice?: boolean;          // Was this spoken?
}

export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  avatarUri?: string;

  // Cultivation Profile
  experience: 'Novice' | 'Intermediate' | 'Expert' | 'Pro';
  grow_mode?: 'Indoor' | 'Outdoor' | 'Greenhouse';
  goal?: 'Maximize Yield' | 'Improve Quality' | 'Learn Skills';
  space?: 'Small' | 'Medium' | 'Large';

  // App State
  isOnboarded?: boolean;
  streak?: number;       // Consecutive days visited
  lastVisit?: string;    // ISO Date of last open
}
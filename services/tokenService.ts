import { supabase } from './supabaseClient';
import { CONFIG } from './config';

export interface TokenState {
  balance: number;
  free_uses_remaining: number;
  is_annual_active: boolean;
  annual_expires_at: string | null;
  annual_daily_count: number;
  annual_last_reset_date: string;
}

const STORAGE_KEY = 'mg_token_state';
const ANNUAL_DAILY_CAP = 100;

const defaultState: TokenState = {
  balance: 0,
  free_uses_remaining: CONFIG.FREE_CREDITS,
  is_annual_active: false,
  annual_expires_at: null,
  annual_daily_count: 0,
  annual_last_reset_date: '',
};

export const getTokenState = (): TokenState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing keys from older state shapes
    return { ...defaultState, ...parsed };
  } catch {
    return { ...defaultState };
  }
};

const saveTokenState = (state: TokenState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const isAnnualPlanValid = (state: TokenState): boolean => {
  if (!state.is_annual_active) return false;
  if (!state.annual_expires_at) return false;
  return new Date(state.annual_expires_at) > new Date();
};

export const checkAndResetDailyCount = (state: TokenState): TokenState => {
  const today = new Date().toISOString().split('T')[0];
  if (state.annual_last_reset_date !== today) {
    return { ...state, annual_daily_count: 0, annual_last_reset_date: today };
  }
  return state;
};

export const checkFeatureAccess = (
  costCredits: number
): { allowed: true; via: 'annual' | 'free_use' | 'credits' } | { allowed: false; reason: 'daily_cap_reached' | 'insufficient_credits' } => {
  let state = getTokenState();

  // 1. Annual plan check
  if (isAnnualPlanValid(state)) {
    state = checkAndResetDailyCount(state);
    if (state.annual_daily_count >= ANNUAL_DAILY_CAP) {
      saveTokenState(state);
      return { allowed: false, reason: 'daily_cap_reached' };
    }
    state.annual_daily_count += 1;
    saveTokenState(state);
    return { allowed: true, via: 'annual' };
  }

  // 2. Free uses check
  if (state.free_uses_remaining > 0) {
    state.free_uses_remaining -= 1;
    saveTokenState(state);
    return { allowed: true, via: 'free_use' };
  }

  // 3. Credit balance check
  if (state.balance >= costCredits) {
    const newBalance = Math.round((state.balance - costCredits) * 10) / 10;
    state.balance = newBalance;
    saveTokenState(state);
    return { allowed: true, via: 'credits' };
  }

  return { allowed: false, reason: 'insufficient_credits' };
};

export const getDisplayBalance = (): number => {
  return Math.floor(getTokenState().balance);
};

export const activateAnnualPlan = (expiresAt: string): void => {
  const state = getTokenState();
  const updated: TokenState = {
    ...state,
    is_annual_active: true,
    annual_expires_at: expiresAt,
    annual_daily_count: 0,
    annual_last_reset_date: new Date().toISOString().split('T')[0],
  };
  saveTokenState(updated);
};

export const addCredits = (amount: number): void => {
  const state = getTokenState();
  const newBalance = Math.round((state.balance + amount) * 10) / 10;
  saveTokenState({ ...state, balance: newBalance });
};

export interface ActivateResult {
  success: boolean;
  type?: 'credits' | 'annual';
  credits_credited?: number;
  expires_at?: string;
  error?: string;
}

export const activateWhopPurchase = async (email: string): Promise<ActivateResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('whop-activate-tokens', {
      body: { email },
    });

    if (error) {
      return { success: false, error: error.message || 'Activation request failed.' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Activation failed. Please try again.' };
    }

    if (data.type === 'credits') {
      addCredits(data.credits_credited);
      return { success: true, type: 'credits', credits_credited: data.credits_credited };
    }

    if (data.type === 'annual') {
      activateAnnualPlan(data.expires_at);
      return { success: true, type: 'annual', expires_at: data.expires_at };
    }

    return { success: false, error: 'Unexpected response from server.' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unexpected error during activation.' };
  }
};

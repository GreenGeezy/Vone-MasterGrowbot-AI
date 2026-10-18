import { describe, expect, it } from 'vitest';
import { normalizeAndroidPlans, annualComparison } from './androidPlans';
import { answerOnboarding, initialDestination } from './onboardingState';
import { AppScreen } from '../types';
import { deleteAccountWithConfirmation } from './accountDeletion';

const plan = (base: string, period: string, amount: number, trial?: string, currency = 'USD') => ({
  identifier: '$rc_' + base, product: { identifier: 'mastergrowbot_pro:' + base,
    defaultOption: { productId: 'mastergrowbot_pro', storeProductId: 'mastergrowbot_pro:' + base, id: base + (trial ? ':free-trial' : ''),
      billingPeriod: { iso8601: period }, fullPricePhase: {price:{amountMicros:amount*1e6,currencyCode:currency,formatted:currency+' '+amount}},
      freePhase: trial ? {billingPeriod:{iso8601:trial},price:{amountMicros:0}} : null } },
});
describe('Android Pro catalog safety', () => {
  it('surfaces annual and weekly only while preserving the exact purchase option', () => {
    const annual = plan('annual','P1Y',59.99,'P3D');
    const result = normalizeAndroidPlans([plan('monthly','P1M',29.99),plan('weekly','P1W',6.99),annual]);
    expect(result.map(p=>p.packageType)).toEqual(['ANNUAL','WEEKLY']);
    expect(result[0].__subscriptionOption).toBe(annual.product.defaultOption);
    expect(result[0].trialDays).toBe(3);
  });
  it('does not borrow trial eligibility from a different option', () => {
    const base = plan('annual','P1Y',59.99);
    (base.product as any).subscriptionOptions=[plan('annual','P1Y',59.99,'P3D').product.defaultOption];
    expect(normalizeAndroidPlans([base])[0].trialDays).toBeNull();
  });
  it('never invents a three-day trial from another duration', () => {
    expect(normalizeAndroidPlans([plan('annual','P1Y',59.99,'P7D')])[0].trialDays).toBeNull();
  });
  it('rejects another product, malformed prices, and missing options', () => {
    const wrong=plan('annual','P1Y',59.99);wrong.product.defaultOption.productId='other_product';
    expect(normalizeAndroidPlans([wrong,plan('annual','P1Y',NaN),{product:{priceString:'$59.99'}}])).toEqual([]);
  });
  it('computes 83% savings and a $1.15 weekly equivalent from actual numeric prices', () => {
    const [annual,weekly]=normalizeAndroidPlans([plan('annual','P1Y',59.99),plan('weekly','P1W',6.99)]);
    const result=annualComparison(annual,weekly);
    expect(result.badge).toBe('Save 83% vs weekly');expect(result.subtext).toContain('1.15');
  });
  it('suppresses savings for different currencies or absent reference prices', () => {
    const [annual]=normalizeAndroidPlans([plan('annual','P1Y',59.99)]);
    expect(annualComparison(annual,{product:{price:6.99,currencyCode:'EUR'}}).badge).toBeNull();
    expect(annualComparison(null,null)).toEqual({badge:null,subtext:null});
  });
});
describe('Onboarding preserves intended destinations', () => {
  it.each([['health',AppScreen.DIAGNOSE],['skills',AppScreen.STRAINS],['size',AppScreen.JOURNAL],['organize',AppScreen.JOURNAL],['explore',AppScreen.HOME]])('%s routes to a real AppScreen', (goal,destination) => {
    expect(initialDestination(answerOnboarding({},'onboardingGoal',goal))).toBe(destination);
  });
});
describe('Deletion confirmation', () => {
  it('preserves device state on an unconfirmed or failed deletion', async () => {
    let cleared=false;
    await expect(deleteAccountWithConfirmation({remove:async()=>({ok:false}),clear:()=>{cleared=true;}})).rejects.toThrow();
    expect(cleared).toBe(false);
  });
});

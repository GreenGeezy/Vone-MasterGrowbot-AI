export function trialDuration(intro?: {periodNumberOfUnits?:number;periodUnit?:string}):string|null {
  const count=Number(intro?.periodNumberOfUnits);
  const unit=String(intro?.periodUnit||'').toLowerCase();
  if(!Number.isInteger(count)||count<1||!['day','week','month','year'].includes(unit))return null;
  return `${count} ${unit}${count===1?'':'s'}`;
}
export function receiptEnvironment(info:any):'sandbox'|'production'|'unverified' {
  const entitlements=Object.values(info?.entitlements?.all||info?.entitlements?.active||{}) as any[];
  if(entitlements.some(x=>x.isSandbox===true))return 'sandbox';
  if(entitlements.some(x=>x.isSandbox===false))return 'production';
  return 'unverified';
}

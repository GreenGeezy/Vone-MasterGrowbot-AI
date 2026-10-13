const legacyProProducts=new Set(['weekly_pro_v2','monthly_pro_v2','yearly_pro_v2','mastergrowbot_pro_weekly_v3','mastergrowbot_pro_yearly_v3','com.mastergrowbot.ai.sub.weekly','com.mastergrowbot.ai.sub.monthly']);
export function hasVerifiedPaidAccess(info:any):boolean {
  return Boolean(info?.entitlements?.active?.pro || info?.entitlements?.active?.machine_vision ||
    info?.activeSubscriptions?.some((id:string)=>legacyProProducts.has(id)));
}

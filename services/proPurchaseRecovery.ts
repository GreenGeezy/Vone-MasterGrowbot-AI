import { Preferences } from '@capacitor/preferences';
const KEY='mg_rc_pending_pro_purchase';
export async function pendingProPurchase() {return (await Preferences.get({key:KEY})).value==='true';}
export async function markProPurchasePending(pending:boolean) {
  if(pending)await Preferences.set({key:KEY,value:'true'});else await Preferences.remove({key:KEY});
}

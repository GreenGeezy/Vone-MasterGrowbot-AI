import React, { useEffect, useState } from 'react';
import { X, Check, Shield, Star, Zap } from 'lucide-react';
import { Purchases, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import Growbot from '../components/Growbot';

interface PaywallProps {
  onClose: () => void;
  onPurchase: () => void;
  onSkip: () => void;
}

const Paywall: React.FC<PaywallProps> = ({ onClose, onPurchase, onSkip }) => {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setOffering(offerings.current);
          // Auto-select monthly if available
          const monthlyPkg = offerings.current.availablePackages.find(p => p.product.identifier === 'mg_499_1m');
          if (monthlyPkg) setSelectedPkg(monthlyPkg.identifier);
        } else {
          setError("No products found. Ensure you attached Google Play products to your Default offering in RevenueCat.");
        }
      } catch (e: any) {
        let message = "Failed to load products.";
        if (e.message.includes("network")) message = "Network error. Please check your connection.";
        setError(message);
        console.error("Error fetching offerings:", e);
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPkg || !offering) return;
    setLoading(true);
    try {
      const pkg = offering.availablePackages.find(p => p.identifier === selectedPkg);
      if (!pkg) throw new Error("Package not found");
      
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      if (customerInfo.entitlements.active['pro_access']) {
        onPurchase();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        alert(`Purchase failed: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
          <Growbot size="lg" mood="sad" />
          <h2 className="text-xl font-bold text-text-main mt-4">Oops!</h2>
          <p className="text-text-sub my-4">{error}</p>
          <button onClick={onSkip} className="text-primary font-bold">Continue with Free Plan</button>
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Growbot size="md" mood="thinking" className="animate-bounce" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface overflow-y-auto pb-8">
      <div className="relative h-64 bg-primary overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558350253-34c1962510a7')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
         <div className="absolute top-4 right-4 z-20">
             <button onClick={onSkip} className="bg-black/20 text-white p-2 rounded-full hover:bg-black/30 transition-colors"><X size={20} /></button>
         </div>
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-surface to-transparent z-10 text-center">
             <Growbot size="lg" mood="happy" className="mx-auto mb-2" />
             <h1 className="text-3xl font-black text-text-main tracking-tight">Unlock Your<br/>Dream Harvest.</h1>
             <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full mt-3">
                <Shield size={14} className="fill-current" />
                <span className="text-xs font-bold uppercase tracking-wider">Pro Access</span>
             </div>
         </div>
      </div>
      
      <div className="px-6 -mt-4 relative z-20">
          <div className="bg-white rounded-[2rem] p-6 shadow-card border border-gray-100 mb-6 space-y-4">
              <div className="flex items-start gap-3"><div className="bg-green-100 text-green-600 p-1.5 rounded-full"><Check size={16} strokeWidth={3} /></div><div><h3 className="font-bold text-text-main">Unlimited AI Diagnosis</h3><p className="text-xs text-text-sub">Instant, accurate identification of pests & diseases.</p></div></div>
              <div className="flex items-start gap-3"><div className="bg-blue-100 text-blue-600 p-1.5 rounded-full"><Check size={16} strokeWidth={3} /></div><div><h3 className="font-bold text-text-main">24/7 Expert Chatbot</h3><p className="text-xs text-text-sub">Your personal cultivation coach, always available.</p></div></div>
              <div className="flex items-start gap-3"><div className="bg-purple-100 text-purple-600 p-1.5 rounded-full"><Check size={16} strokeWidth={3} /></div><div><h3 className="font-bold text-text-main">Advanced Grow Journal</h3><p className="text-xs text-text-sub">Track every detail with photos and AI insights.</p></div></div>
          </div>

          <div className="space-y-3 mb-6">
              {offering.availablePackages.map((pkg) => {
                const isMonthly = pkg.product.identifier === 'mg_499_1m';
                const isYearly = pkg.product.identifier === 'mg_2999_1y';
                const isSelected = selectedPkg === pkg.identifier;
                
                return (
                  <div 
                    key={pkg.identifier} 
                    onClick={() => setSelectedPkg(pkg.identifier)}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    {isYearly && <div className="absolute -top-3 left-4 bg-orange-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} className="fill-current" /> Best Value</div>}
                    <div>
                        <h4 className="font-bold text-text-main text-lg">{isMonthly ? 'Monthly' : 'Yearly'}</h4>
                        <p className="text-xs text-text-sub font-medium">{pkg.product.priceString} / {isMonthly ? 'month' : 'year'}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
          </div>

          <button onClick={handlePurchase} disabled={loading || !selectedPkg} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Zap size={20} className="fill-current" /> Unlock Pro Now</>}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-4 font-medium">Cancel anytime. Secure payment via Google Play.</p>
      </div>
    </div>
  );
};

export default Paywall;

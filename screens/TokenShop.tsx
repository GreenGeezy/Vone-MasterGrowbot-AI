import React, { useState } from 'react';
import { X, Zap, Star, Crown } from 'lucide-react';
import { CONFIG } from '../services/config';
import { getDisplayBalance, activateWhopPurchase } from '../services/tokenService';

interface TokenShopProps {
  onClose?: () => void;
  featureCostCredits?: number;
  onTokensActivated: () => void;
}

const TokenShop: React.FC<TokenShopProps> = ({ onClose, featureCostCredits, onTokensActivated }) => {
  const [activateEmail, setActivateEmail] = useState('');
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showActivate, setShowActivate] = useState(false);

  const handleActivate = async () => {
    if (!activateEmail.trim()) return;
    setActivating(true);
    setActivateMsg(null);
    const result = await activateWhopPurchase(activateEmail.trim());
    setActivating(false);
    if (result.success) {
      if (result.type === 'credits') {
        setActivateMsg({ type: 'success', text: `✓ ${result.credits_credited} AI credits added to your account!` });
      } else {
        const expDate = result.expires_at ? new Date(result.expires_at).toLocaleDateString() : '';
        setActivateMsg({ type: 'success', text: `✓ Pro Annual activated! Unlimited AI access until ${expDate}` });
      }
      setTimeout(() => onTokensActivated(), 2000);
    } else {
      setActivateMsg({ type: 'error', text: result.error || 'Activation failed. Please try again.' });
    }
  };

  const packs = [
    {
      key: 'seedling' as const,
      label: 'Seedling Pack',
      price: '$4.99',
      creditsLabel: '10 AI credits',
      equiv: '= 10 plant scans, or 20 strain intelligence calls, or 33 journal analyses',
      badge: null,
      highlight: false,
    },
    {
      key: 'grower' as const,
      label: 'Grower Pack',
      price: '$9.99',
      creditsLabel: '25 AI credits',
      equiv: '= 25 plant scans, or 50 strain intelligence calls, or 83 journal analyses',
      badge: 'Most Popular',
      highlight: true,
    },
    {
      key: 'master' as const,
      label: 'Master Pack',
      price: '$19.99',
      creditsLabel: '60 AI credits',
      equiv: '= 60 plant scans, or 120 strain intelligence calls, or 200 journal analyses',
      badge: null,
      highlight: false,
    },
    {
      key: 'annual' as const,
      label: 'Pro Annual',
      price: '$99.99/year',
      creditsLabel: 'Unlimited',
      equiv: 'Unlimited plant scans, strain intelligence, and journal analyses for a full year',
      badge: 'Best Value',
      highlight: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-green-500" />
          <h1 className="text-xl font-black text-gray-900">Get AI Credits</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full space-y-4">
        {/* Balance info */}
        {featureCostCredits !== undefined && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm">
            <p className="font-bold text-orange-800">
              You need <span className="text-orange-600">{featureCostCredits} credit{featureCostCredits !== 1 ? 's' : ''}</span> for this feature.
            </p>
            <p className="text-orange-600 font-medium mt-1">Your balance: <span className="font-black">{getDisplayBalance()} credits</span></p>
          </div>
        )}

        {/* Pricing cards */}
        {packs.map((pack) => (
          <button
            key={pack.key}
            onClick={() => { window.location.href = CONFIG.WHOP.PACKS[pack.key].url; }}
            className={`w-full text-left p-5 rounded-[1.5rem] border-2 transition-all active:scale-[0.98] relative overflow-hidden
              ${pack.highlight
                ? 'bg-green-600 border-green-600 text-white shadow-xl shadow-green-200'
                : 'bg-white border-gray-200 text-gray-900 hover:border-green-300 shadow-sm'
              }`}
          >
            {pack.badge && (
              <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                ${pack.highlight ? 'bg-white text-green-700' : 'bg-green-100 text-green-700'}`}>
                {pack.badge === 'Most Popular' && <Star size={10} className="inline mr-1" />}
                {pack.badge === 'Best Value' && <Crown size={10} className="inline mr-1" />}
                {pack.badge}
              </div>
            )}
            <div className="flex items-start justify-between pr-24">
              <div>
                <p className={`font-black text-lg leading-tight ${pack.highlight ? 'text-white' : 'text-gray-900'}`}>{pack.label}</p>
                <p className={`text-2xl font-black mt-1 ${pack.highlight ? 'text-white' : 'text-green-600'}`}>{pack.price}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-sm ${pack.highlight ? 'text-green-100' : 'text-gray-700'}`}>{pack.creditsLabel}</p>
              </div>
            </div>
            <p className={`text-xs mt-3 leading-relaxed ${pack.highlight ? 'text-green-100' : 'text-gray-500'}`}>{pack.equiv}</p>
          </button>
        ))}

        {/* Already purchased collapsible */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowActivate(!showActivate)}
            className="w-full px-5 py-4 text-left flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold text-gray-700">Already purchased? Activate here</span>
            <span className={`text-gray-400 text-lg font-bold transition-transform ${showActivate ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {showActivate && (
            <div className="px-5 pb-5 pt-4 space-y-3 bg-white">
              <p className="text-xs text-gray-500 font-medium">Enter the email you used at checkout to activate your purchase.</p>
              <input
                type="email"
                placeholder="your@email.com"
                value={activateEmail}
                onChange={(e) => setActivateEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              />
              <button
                onClick={handleActivate}
                disabled={activating || !activateEmail.trim()}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm uppercase tracking-wider active:scale-95 transition-transform disabled:opacity-50"
              >
                {activating ? 'Activating...' : 'Activate'}
              </button>
              {activateMsg && (
                <div className={`p-3 rounded-xl text-sm font-medium ${activateMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {activateMsg.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenShop;

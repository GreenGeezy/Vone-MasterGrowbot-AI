import React, { useState } from 'react';
import { Zap, ArrowLeft } from 'lucide-react';
import { activateWhopPurchase, getDisplayBalance } from '../services/tokenService';

interface TokenActivateProps {
  onComplete: () => void;
  onBack: () => void;
}

const TokenActivate: React.FC<TokenActivateProps> = ({ onComplete, onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await activateWhopPurchase(email.trim());
    setLoading(false);

    if (result.success) {
      if (result.type === 'credits') {
        setSuccessMsg(`✓ ${result.credits_credited} AI credits added to your account! New balance: ${getDisplayBalance()} credits`);
      } else {
        const expDate = result.expires_at ? new Date(result.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        setSuccessMsg(`✓ Pro Annual activated! Unlimited AI access until ${expDate}`);
      }
      setTimeout(() => onComplete(), 2000);
    } else {
      setErrorMsg(result.error || 'Activation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Icon + heading */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Activate Your Purchase</h1>
          <p className="text-sm text-gray-500 font-medium mt-2">
            Enter the email address you used at Whop checkout to activate your credits.
          </p>
        </div>

        {/* Email input */}
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
          disabled={!!successMsg}
          className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-base font-medium outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 disabled:opacity-50"
        />

        {/* Activate button */}
        <button
          onClick={handleActivate}
          disabled={loading || !email.trim() || !!successMsg}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-base uppercase tracking-wider shadow-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Activating...' : 'Activate My Purchase'}
        </button>

        {/* Success message */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-sm font-medium text-green-800">
            {successMsg}
            <p className="text-xs text-green-600 mt-2 font-bold">Returning to app in 2 seconds...</p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm font-medium text-red-800">
            {errorMsg}
          </div>
        )}

        {/* Back link */}
        {!successMsg && (
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 w-full text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            <ArrowLeft size={16} />
            Go back to plans
          </button>
        )}
      </div>
    </div>
  );
};

export default TokenActivate;

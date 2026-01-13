// ... (Keep existing imports)

// IN THE RENDER RETURN:
{/* Plans Section - ensure text-text-main or text-gray-900 is used */}
<div className="flex-1 bg-white border-t border-gray-100 rounded-t-[1.5rem] relative shadow-[0_-10px_60px_rgba(0,0,0,0.05)] overflow-y-auto no-scrollbar flex flex-col">
    <div className="px-6 pt-5 pb-8 flex-1 flex flex-col">
        {/* Benefits List */}
        <div className="mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">What's Included:</h3>
            <div className="grid grid-cols-1 gap-3">
                {[
                    { icon: Infinity, text: "Unlimited AI Diagnoses", sub: "Instant pest & disease ID" },
                    { icon: Headphones, text: "24/7 Grow Coach Chat", sub: "Expert advice anytime" },
                    { icon: Sprout, text: "Advanced Grow Journal", sub: "Track water, nutrients, & light" }
                ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><benefit.icon size={20} /></div>
                    <div>
                        <span className="block text-sm font-extrabold text-gray-900">{benefit.text}</span>
                        <span className="text-xs text-gray-500 font-medium">{benefit.sub}</span>
                    </div>
                </div>
                ))}
            </div>
        </div>
        
        {/* ... (Keep your Plan Selection buttons, just ensure text-gray-900 is used for titles) */}
    </div>
</div>

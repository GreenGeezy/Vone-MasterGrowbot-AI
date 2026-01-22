import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Mic, Power, Loader2, Zap } from 'lucide-react';
import { sendMessage } from '../services/geminiService';
import { UserProfile } from '../types';

interface ChatProps {
  onSaveToJournal: (entry: any) => void;
  plant: any;
  userProfile: UserProfile | null;
}

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([
    { role: 'model', text: `Greetings. I am MasterGrowbot. How is your garden thriving today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [persona, setPersona] = useState('Kore');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = ["Fix yellow leaves", "Harvest check", "Nutrient schedule", "Humidity check"];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(text, plant, userProfile, persona);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error: any) {
      alert(`AI Connection Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLiveMode) {
      return (
          <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center text-white p-6 animate-fade-in">
              <div className="absolute top-6 right-6">
                  <button onClick={() => setIsLiveMode(false)} className="bg-red-500/20 p-4 rounded-full text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white transition-colors">
                      <Power size={24} />
                  </button>
              </div>
              
              <div className="absolute top-6 left-6 flex items-center gap-2 text-red-500 animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-xs font-mono uppercase tracking-widest">LIVE UPLINK</span>
              </div>
              
              <div className="w-64 h-64 rounded-full bg-gradient-to-t from-primary/10 to-blue-500/5 flex items-center justify-center mb-12 relative">
                  <Bot size={100} className="text-primary animate-bounce" />
                  <div className="absolute inset-0 border border-primary/20 rounded-full animate-ping" />
              </div>

              <h2 className="text-xl font-bold tracking-[0.2em] uppercase mb-2 text-white">AI Cultivation Coach</h2>
              <p className="text-gray-500 text-sm mb-12 font-mono">Listening on 16kHz PCM...</p>

              <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-full border border-white/10">
                  {['Kore', 'Charon', 'Puck'].map((p) => (
                      <button 
                        key={p}
                        onClick={() => setPersona(p)}
                        className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                            persona === p ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                          {p}
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="p-4 border-b border-white/20 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
                <Bot size={24} />
            </div>
            <div>
                <h1 className="text-lg font-bold text-text-main flex items-center gap-2">
                    AI Coach <Sparkles size={14} className="text-yellow-500 fill-yellow-500" />
                </h1>
                <p className="text-xs text-gray-500 font-medium">Gemini 2.5 • {persona}</p>
            </div>
        </div>
        <button 
            onClick={() => setIsLiveMode(true)}
            className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
            <Mic size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center mr-2 shadow-sm shrink-0">
                    <Bot size={16} className="text-primary" />
                </div>
            )}
            <div className={`max-w-[85%] p-4 text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-2xl rounded-tr-none' 
                : 'bg-white/80 backdrop-blur-md text-text-main border border-white/50 rounded-2xl rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-xs ml-12 animate-pulse">
             <Zap size={12} className="text-yellow-500 fill-yellow-500" /> Connecting to Neural Network...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white/80 backdrop-blur-xl border-t border-white/20 z-20 pb-8">
        <div className="flex gap-2 overflow-x-auto p-3 scrollbar-hide">
            {quickPrompts.map(p => (
                <button key={p} onClick={() => handleSend(p)} className="whitespace-nowrap px-4 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 font-medium hover:border-primary hover:text-primary transition-colors shadow-sm">
                    {p}
                </button>
            ))}
        </div>
        
        <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
            <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your grow..."
                className="flex-1 bg-transparent border-none outline-none text-sm p-2 text-text-main"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50"
            >
                <Send size={18} />
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

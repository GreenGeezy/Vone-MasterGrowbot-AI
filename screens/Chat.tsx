import React, { useState, useRef, useEffect } from 'react';
import { Send, AudioLines, X, Power, Settings2, Check, Activity, Mic } from 'lucide-react';
import { sendMessage } from '../services/geminiService';
import { ChatMessage, JournalEntry, Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';

interface ChatProps {
    onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
    plant?: Plant;
    userProfile?: UserProfile | null;
}

const SUGGESTED_PROMPTS = ["Fix yellow leaves", "Feeding schedule", "Harvest check", "Mold prevention"];

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Coach Kore', type: 'Calm' },
  { id: 'Charon', label: 'Coach Mike', type: 'Bold' },
  { id: 'Fenrir', label: 'MasterGrowbot', type: 'Synthetic' },
  { id: 'Puck', label: 'Coach Puck', type: 'Energetic' },
];

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
        id: '1', 
        text: "Greetings. I am MasterGrowbot. How is your garden thriving today?", 
        role: 'model', 
        timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), text, role: 'user', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        const response = await sendMessage(text, plant, userProfile, selectedVoice);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: response, role: 'model', timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
        // Fallback message so user isn't left hanging
        const errorMsg: ChatMessage = { 
            id: Date.now().toString(), 
            text: "I'm having trouble connecting to the new AI brain. Please try again in a moment.", 
            role: 'model', 
            timestamp: Date.now() 
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setLoading(false);
    }
  };

  const startLiveSession = () => {
      setIsLive(true);
      setLiveTranscript("Initializing Uplink...");
      setTimeout(() => setLiveTranscript("Listening..."), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-surface pb-24 relative overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 p-4 pt-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <Growbot size="sm" mood={loading ? 'thinking' : 'happy'} />
            <div>
                <h1 className="font-bold text-text-main text-lg leading-none">MasterGrowbot</h1>
                <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mt-1">AI Cultivation Coach</p>
            </div>
        </div>
        <div className="relative">
            <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className="p-2 text-text-sub hover:text-primary bg-gray-50 rounded-full border border-gray-100"><Settings2 size={20} /></button>
            {showVoiceSettings && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-50 mb-1">Select Persona</p>
                    {VOICE_OPTIONS.map(v => (
                        <button key={v.id} onClick={() => { setSelectedVoice(v.id); setShowVoiceSettings(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex justify-between ${selectedVoice === v.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}`}>
                            {v.label} {selectedVoice === v.id && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`p-4 text-sm max-w-[85%] rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-text-main text-white rounded-tr-sm' : 'bg-white text-text-main rounded-tl-sm border border-gray-100'}`}>
                {msg.text}
            </div>
          </div>
        ))}
        {loading && <div className="pl-4"><div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div></div>}
        <div ref={endRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 bg-white/80 backdrop-blur-lg border-t border-gray-100 z-30 pb-6">
        <div className="flex overflow-x-auto gap-2 mb-3 no-scrollbar">
            {SUGGESTED_PROMPTS.map(p => <button key={p} onClick={() => handleSend(p)} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold shadow-sm text-text-main">{p}</button>)}
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[24px] px-2 py-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(input)} placeholder="Ask MasterGrowbot..." className="flex-1 bg-transparent outline-none text-sm ml-2" />
          <button onClick={startLiveSession} className="p-2 rounded-full text-text-sub hover:text-red-500"><AudioLines size={20} /></button>
          <button onClick={() => handleSend(input)} className="w-9 h-9 bg-text-main text-white rounded-full flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
      
      {/* Live Uplink Overlay */}
      {isLive && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-between p-6 animate-in fade-in">
           <div className="w-full flex justify-between items-start">
               <span className="text-red-500 font-mono text-xs uppercase tracking-widest animate-pulse flex items-center gap-2"><Activity size={14} /> Live Uplink Active</span>
               <button onClick={() => setIsLive(false)} className="p-3 bg-gray-100 rounded-full"><X size={20} /></button>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative">
                  <Growbot size="xl" mood="speaking" />
                  <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
              </div>
              <p className="mt-8 text-xl font-medium text-text-main text-center">"{liveTranscript}"</p>
           </div>
           <button onClick={() => setIsLive(false)} className="bg-red-500 text-white p-6 rounded-full shadow-xl"><Power size={32} /></button>
        </div>
      )}
    </div>
  );
};
export default Chat;

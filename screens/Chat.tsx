import React, { useState, useRef, useEffect } from 'react';
import { Send, AudioLines, X, Power, Settings2, Check, Sparkles, Mic } from 'lucide-react';
import { sendMessage } from '../services/geminiService';
import { ChatMessage, JournalEntry, Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

interface ChatProps {
  onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  plant?: Plant;
  userProfile?: UserProfile | null;
}

const SUGGESTED_PROMPTS = [
  "Fix yellow leaves 🍂",
  "Feeding schedule 💧",
  "Harvest window ✂️",
  "Prevent mold 🛡️"
];

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Coach Kore', type: 'Calm', pitch: 1.0, rate: 1.0 },
  { id: 'Charon', label: 'Coach Mike', type: 'Bold', pitch: 0.8, rate: 1.1 },
  { id: 'Fenrir', label: 'MasterGrowbot', type: 'Synthetic', pitch: 1.2, rate: 0.9 },
  { id: 'Puck', label: 'Coach Puck', type: 'Energetic', pitch: 1.1, rate: 1.2 },
];

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome to the team, Grower! 🌿 I am MasterGrowbot AI. Ready to optimize your garden? What are we working on today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("Initializing Uplink...");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState('Kore');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isLive]);

  useEffect(() => {
    return () => {
      stopLiveSession();
      TextToSpeech.stop();
    };
  }, []);

  const handleSend = async (text: string = input, forceVoice: boolean = false) => {
    // Native TTS doesn't need priming like Web Speech does!
    if (!text.trim()) return;

    // Use forceVoice (from callback) or current state (if available correctly)
    // Fix: referencing isLive directly here might be stale if called from startLiveSession closure
    const activeVoiceMode = forceVoice || isLive;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextPrefix = plant
        ? `[Context: Plant=${plant.name}, Stage=${plant.stage}, Strain=${plant.strain}] `
        : '';
      const finalPrompt = contextPrefix + text;

      // Pass the effective voice mode
      const responseText = await sendMessage(finalPrompt, activeVoiceMode);

      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);

      // Always speak if Live/Forced
      if (activeVoiceMode) {
        speakResponse(responseText);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting to the garden network. Please check your internet and try again.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const startLiveSession = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice features require a supported browser (Chrome/Safari/Android).");
      return;
    }

    setIsLive(true);
    setLiveTranscript("Listening...");

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsUserSpeaking(true);

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');

      setLiveTranscript(transcript);

      if (event.results[0].isFinal) {
        setIsUserSpeaking(false);
        setLiveTranscript("Thinking...");
        // FIXED: Explicitly pass true for forceVoice
        handleSend(transcript, true);
      }
    };

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log("Recognition already started");
    }
  };

  const stopLiveSession = () => {
    setIsLive(false);
    setIsUserSpeaking(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    TextToSpeech.stop();
  };

  const speakResponse = async (text: string) => {
    // 1. Immediately update UI (Fixes "Thinking..." loop)
    const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '').replace(/\*/g, '');
    if (isLive) setLiveTranscript(cleanText);

    try {
      await TextToSpeech.stop(); // Clear queue
      const config = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

      await TextToSpeech.speak({
        text: cleanText,
        lang: 'en-US',
        rate: config.rate,
        pitch: config.pitch,
        volume: 1.0,
        category: 'ambient',
      });

      // Keep listing loop logic if desired (timeout based)
      if (isLive) {
        // Simple reset after estimated speech time + buffer
        const estimatedTime = (cleanText.length * 60) + 1500;
        setTimeout(() => {
          if (isLive) {
            setLiveTranscript("Tap to Speak");
            // Optional: Auto-restart listening? 
            // try { recognitionRef.current.start(); } catch (e) {} 
          }
        }, estimatedTime);
      }

    } catch (e) {
      console.error("Native TTS failed", e);
      // Fallback: Web Speech API (for testing in browser)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 relative overflow-hidden font-sans">
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-4 pt-12 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Growbot size="sm" mood={loading ? 'thinking' : 'happy'} />
            {isLive && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-2 border-white rounded-full bg-green-500 animate-pulse"></div>}
          </div>
          <div>
            <h1 className="font-black text-gray-800 text-lg leading-none tracking-tight">MasterGrowbot AI</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
              AI Cultivation Assistant
            </p>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className="p-2 text-gray-400 hover:text-green-600 transition-colors bg-gray-50 rounded-full border border-gray-100">
            <Settings2 size={20} />
          </button>
          {showVoiceSettings && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-50 mb-1">Select Persona</p>
              {VOICE_OPTIONS.map(v => (
                <button key={v.id} onClick={() => { setSelectedVoiceId(v.id); setShowVoiceSettings(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${selectedVoiceId === v.id ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                  {v.label} {selectedVoiceId === v.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-black text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start pl-4"><div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-150"></div></div></div>}
        <div ref={endRef} />
      </div>
      <div className="px-4 py-2 overflow-x-auto whitespace-nowrap no-scrollbar z-20 mb-1">
        {SUGGESTED_PROMPTS.map(prompt => (
          <button key={prompt} onClick={() => { handleSend(prompt); }} className="inline-flex items-center gap-1.5 mr-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600 font-bold shadow-sm hover:border-green-400 hover:text-green-600 transition-colors">
            <Sparkles size={12} /> {prompt}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-30 pb-8">
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-2 py-2 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask your coach..." className="flex-1 bg-transparent outline-none text-sm text-gray-800 ml-4 placeholder-gray-400 font-medium" />
          <button onClick={() => { startLiveSession(); }} className="p-3 bg-white text-gray-600 rounded-full hover:text-green-600 shadow-sm hover:shadow-md transition-all"><AudioLines size={20} /></button>
          <button onClick={() => handleSend()} disabled={loading || !input.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() ? 'bg-black text-white shadow-md hover:scale-105' : 'bg-gray-200 text-gray-400'}`}><Send size={16} /></button>
        </div>
      </div>
      {isLive && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 animate-in fade-in duration-300">
          <div className="w-full flex justify-between items-start pt-10">
            <div className="flex items-center gap-2"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span><span className="text-green-600 font-mono text-xs font-black uppercase tracking-widest">Live Uplink Active</span></div>
            <button onClick={stopLiveSession} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="relative mb-12"><Growbot size="xl" mood={isUserSpeaking ? 'alert' : 'speaking'} /><div className="absolute inset-0 -m-8 border-2 border-green-500/20 rounded-full animate-ping duration-[3000ms]"></div><div className="absolute inset-0 -m-12 border border-green-500/10 rounded-full animate-ping duration-[3000ms] delay-500"></div></div>
            <div className="w-full max-w-xs text-center space-y-4"><p className="text-2xl font-bold text-gray-800 leading-tight transition-all">"{liveTranscript}"</p><div className="h-1 w-20 bg-gray-100 mx-auto rounded-full overflow-hidden">{loading && <div className="h-full bg-green-500 animate-progress"></div>}</div></div>
          </div>
          <div className="pb-8 flex flex-col items-center gap-4"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tap to Disconnect</p><button onClick={stopLiveSession} className="bg-red-500 text-white p-6 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"><Power size={32} /></button></div>
        </div>
      )}
    </div>
  );
};

export default Chat;
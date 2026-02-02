import React, { useState, useRef, useEffect } from 'react';
import { Send, AudioLines, X, Power, Settings2, Check, Sparkles, Mic, User, Bot } from 'lucide-react';
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

const FILLER_PHRASES = [
  "Let me think about that...",
  "Checking my database...",
  "One moment, Grower...",
  "Analyzing your request...",
  "Let me see...",
  "Hold on a second..."
];

const VOICE_OPTIONS = [
  { id: 'Mike', label: 'Coach Mike', type: 'Male', pitch: 1.0, rate: 1.0, icon: User },
  { id: 'Mary', label: 'Coach Mary', type: 'Female', pitch: 1.1, rate: 1.05, icon: User },
  { id: 'MasterGrowbot', label: 'MasterGrowbot', type: 'Robot', pitch: 0.8, rate: 0.95, icon: Bot },
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
  const [selectedVoiceId, setSelectedVoiceId] = useState('Mike');

  // Store valid system voices
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isLive]);

  useEffect(() => {
    // Load system voices on mount
    TextToSpeech.getSupportedVoices().then(res => {
      setAvailableVoices(res.voices);
    }).catch(e => console.log("Failed to load voices", e));

    return () => {
      stopLiveSession();
      TextToSpeech.stop();
    };
  }, []);

  const handleSend = async (text: string = input, forceVoice: boolean = false) => {
    if (!text.trim()) {
      // Prevent getting stuck in "Thinking..." if input is empty
      if (forceVoice && isLive) {
        setLiveTranscript("Listening...");
        try {
          if (recognitionRef.current) recognitionRef.current.start();
        } catch (e) { }
      }
      return;
    }

    const activeVoiceMode = forceVoice || isLive;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // IMMEDIATE FEEDBACK: Play filler phrase if in voice mode
      if (activeVoiceMode) {
        const randomFiller = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
        // Don't await filler, let it play while we fetch
        speakResponse(randomFiller, false);
      }

      // REMOVED CONTEXT: Bot receives raw text for general advice
      const finalPrompt = text;

      const responseText = await sendMessage(finalPrompt, activeVoiceMode);

      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);

      // Always speak real response if Live/Forced (Interrupts filler)
      if (activeVoiceMode) {
        // Pass true to restart listening after this response
        speakResponse(responseText, true);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting to the garden network. Please check your internet and try again.", timestamp: Date.now() }]);
      // Safety reset logic for error case
      if (activeVoiceMode) {
        speakResponse("Sorry, I had trouble connecting. Please try again.", true);
      }
    } finally {
      setLoading(false);
    }
  };

  const startLiveSession = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice features require a supported browser (Chrome/Safari/Android).");
      return;
    }

    // Stop existing instance/watchdog if any
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setIsLive(true);
    setLiveTranscript("Listening...");

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsUserSpeaking(true);
      // Clear any previous watchdog
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');

      setLiveTranscript(transcript);

      if (event.results[0].isFinal) {
        setIsUserSpeaking(false);

        // 1. SAFETY: Start a watchdog timer. If handleSend doesn't resolve within 5s (unlikely, but possible if empty/error), reset.
        watchdogRef.current = setTimeout(() => {
          if (isLive && liveTranscript === "Thinking...") {
            console.log("Watchdog: Resetting stuck session");
            setLiveTranscript("Listening...");
            try { recognitionRef.current.start(); } catch (e) { }
          }
        }, 5000);

        setLiveTranscript("Thinking...");
        // Stop recognition to prevent interference while processing/speaking
        recognitionRef.current.stop();

        if (!transcript.trim()) {
          // Empty result check - restart immediately
          if (watchdogRef.current) clearTimeout(watchdogRef.current);
          setLiveTranscript("Listening...");
          recognitionRef.current.start();
          return;
        }

        handleSend(transcript, true);
      }
    };

    recognitionRef.current.onerror = (e: any) => {
      console.error("Speech Error", e);
      if (e.error === 'no-speech' && isLive) {
        // Silent restart if no speech detected
        try { recognitionRef.current.start(); } catch (e) { }
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
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (recognitionRef.current) recognitionRef.current.abort();
    TextToSpeech.stop();
  };

  const getVoiceIndexForPersona = (personaId: string) => {
    if (!availableVoices.length) return -1;
    // Filter for English voices first
    const englishVoices = availableVoices.filter(v => v.lang.toLowerCase().includes('en'));
    const candidates = englishVoices.length ? englishVoices : availableVoices;

    if (personaId === 'Mike') {
      // Prefer "Male" or specific known male Android identifiers
      return availableVoices.findIndex(v => candidates.includes(v) &&
        (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('en-us-x-iom-local')));
    }
    if (personaId === 'Mary') {
      // Prefer "Female" or specific known female Android identifiers
      return availableVoices.findIndex(v => candidates.includes(v) &&
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('en-us-x-tpf-local')));
    }
    // MasterGrowbot defaults to system default (but pitched down)
    return -1;
  };

  const speakResponse = async (text: string, restartListening: boolean) => {
    // Clear watchdog if we made it here
    if (watchdogRef.current) clearTimeout(watchdogRef.current);

    // 1. Immediately update UI
    const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '').replace(/\*/g, '');
    if (isLive) setLiveTranscript(cleanText);

    try {
      await TextToSpeech.stop(); // Clear previous audio

      const config = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];
      const targetVoiceIndex = getVoiceIndexForPersona(selectedVoiceId);

      await TextToSpeech.speak({
        text: cleanText,
        lang: 'en-US',
        rate: config.rate,
        pitch: config.pitch,
        volume: 1.0,
        category: 'ambient',
        voice: targetVoiceIndex >= 0 ? targetVoiceIndex : undefined,
      });

      // 2. Restart Listening Loop (Only for final responses in Live mode)
      if (isLive && restartListening) {
        setLiveTranscript("Listening...");
        try {
          // Small delay to ensure TTS has fully released audio focus
          setTimeout(() => {
            if (isLive) {
              // Use startLiveSession instead of raw start() to get a fresh instance
              startLiveSession();
            }
          }, 200);
        } catch (e) {
          console.error("Failed to restart listening", e);
        }
      }

    } catch (e) {
      console.error("Native TTS failed", e);
      // Fallback: Web Speech API (for testing in browser)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
        // Fallback loop logic
        if (isLive && restartListening) {
          utterance.onend = () => {
            if (isLive) startLiveSession();
          };
        }
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

          {/* VOICE SELECTION STRIP (NEW) */}
          <div className="flex gap-2 mb-4 bg-gray-100/50 p-1.5 rounded-full border border-gray-100 self-center">
            {VOICE_OPTIONS.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVoiceId(v.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${selectedVoiceId === v.id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <v.icon size={14} />
                {v.label}
              </button>
            ))}
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
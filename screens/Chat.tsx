import React, { useState, useRef, useEffect } from 'react';
import { Send, AudioLines, X, Power, Settings2, Check, Activity, Mic, Sparkles } from 'lucide-react';
import { sendMessage } from '../services/geminiService'; // Uses your secure Supabase backend
import { ChatMessage, JournalEntry, Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';

interface ChatProps {
    onSaveToJournal?: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
    plant?: Plant;
    userProfile?: UserProfile | null;
}

const SUGGESTED_PROMPTS = [
  "Fix yellow leaves",
  "Feeding schedule", 
  "Harvest check", 
  "Mold prevention"
];

// Persona Configuration (Matches Chatbot Summary)
const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Coach Kore', type: 'Calm', pitch: 1.0, rate: 1.0 },
  { id: 'Charon', label: 'Coach Mike', type: 'Bold', pitch: 0.8, rate: 1.1 },
  { id: 'Fenrir', label: 'MasterGrowbot', type: 'Synthetic', pitch: 1.2, rate: 0.9 },
  { id: 'Puck', label: 'Coach Puck', type: 'Energetic', pitch: 1.1, rate: 1.2 },
];

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
        id: '1', 
        role: 'assistant', // Updated to match Gemini API standard
        content: "Greetings. I am MasterGrowbot. How is your garden thriving today?", 
        timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Live Mode State
  const [isLive, setIsLive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("Initializing Uplink...");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  // Settings
  const [selectedVoiceId, setSelectedVoiceId] = useState('Kore');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // Refs
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synth = window.speechSynthesis;

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isLive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSession();
      synth.cancel();
    };
  }, []);

  // --- CORE CHAT LOGIC ---

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // 2. Prepare Context (Inject Plant/User data invisibly)
      const contextPrefix = plant 
        ? `[Context: Plant=${plant.name}, Stage=${plant.stage}, Strain=${plant.strain}] ` 
        : '';
      const finalPrompt = contextPrefix + text;

      // 3. Call Secure Backend
      const responseText = await sendMessage(finalPrompt);
      
      // 4. Add Bot Message
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);

      // 5. If Live Mode, Speak it!
      if (isLive) {
          speakResponse(responseText);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I'm having trouble connecting to the garden network. Please try again.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  // --- VOICE / LIVE LOGIC (Web Speech API) ---

  const startLiveSession = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Voice features require a supported browser (Chrome/Safari/Android).");
        return;
    }

    setIsLive(true);
    setLiveTranscript("Listening...");
    
    // Initialize Recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false; // We want turn-taking
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => setIsUserSpeaking(true);
    
    recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
        
        setLiveTranscript(transcript);
        
        // If final result, send it
        if (event.results[0].isFinal) {
            setIsUserSpeaking(false);
            setLiveTranscript("Thinking...");
            handleSend(transcript);
        }
    };

    recognitionRef.current.onend = () => {
        // Don't restart immediately if we are processing/speaking
        if (!loading && isLive) {
            // Optional: Auto-restart logic can go here for "Continuous" mode
            // For now, we wait for the bot to reply, then the user taps again or we auto-listen
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
    synth.cancel();
  };

  const speakResponse = (text: string) => {
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const config = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];
    
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    
    // Try to match standard system voices
    const voices = synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
        // Automatically listen again after speaking (Conversation Loop)
        if (isLive) {
            setLiveTranscript("Listening...");
            try { recognitionRef.current.start(); } catch (e) {}
        }
    };

    synth.speak(utterance);
  };

  // --- RENDER ---

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 relative overflow-hidden font-sans">
      
      {/* Header with Glassmorphism */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-4 pt-12 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="relative">
                <Growbot size="sm" mood={loading ? 'thinking' : 'happy'} />
                {isLive && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-2 border-white rounded-full bg-green-500 animate-pulse"></div>}
            </div>
            <div>
               <h1 className="font-black text-gray-800 text-lg leading-none tracking-tight">Coach {VOICE_OPTIONS.find(v => v.id === selectedVoiceId)?.label.split(' ')[1]}</h1>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">AI Cultivation Expert</p>
            </div>
        </div>

        {/* Voice Settings Dropdown */}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                ? 'bg-black text-white rounded-2xl rounded-tr-sm' 
                : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
             <div className="flex justify-start pl-4">
                 <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm flex gap-1">
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-75"></div>
                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-150"></div>
                 </div>
             </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 overflow-x-auto whitespace-nowrap no-scrollbar z-20 mb-1">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button key={prompt} onClick={() => handleSend(prompt)} className="inline-flex items-center gap-1.5 mr-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600 font-bold shadow-sm hover:border-green-400 hover:text-green-600 transition-colors">
                <Sparkles size={12} /> {prompt}
            </button>
          ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-30 pb-8">
        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-2 py-2 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
          <input 
             type="text" 
             value={input} 
             onChange={(e) => setInput(e.target.value)} 
             onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
             placeholder="Ask Coach MasterGrowbot..." 
             className="flex-1 bg-transparent outline-none text-sm text-gray-800 ml-4 placeholder-gray-400 font-medium" 
          />
          <button onClick={startLiveSession} className="p-3 bg-white text-gray-600 rounded-full hover:text-green-600 shadow-sm hover:shadow-md transition-all">
              <AudioLines size={20} />
          </button>
          <button 
             onClick={() => handleSend()} 
             disabled={loading || !input.trim()} 
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                 input.trim() ? 'bg-black text-white shadow-md hover:scale-105' : 'bg-gray-200 text-gray-400'
             }`}
          >
              <Send size={16} />
          </button>
        </div>
      </div>

      {/* LIVE UPLINK OVERLAY (From Chatbot Summary & AI Studio) */}
      {isLive && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 animate-in fade-in duration-300">
           {/* Live Header */}
           <div className="w-full flex justify-between items-start pt-10">
               <div className="flex items-center gap-2">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                   </span>
                   <span className="text-red-500 font-mono text-xs font-black uppercase tracking-widest">Live Uplink Active</span>
               </div>
               <button onClick={stopLiveSession} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                   <X size={20} />
               </button>
           </div>

           {/* Live Visualizer */}
           <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="relative mb-10">
                  <Growbot size="xl" mood={isUserSpeaking ? 'alert' : 'speaking'} />
                  {/* Ping Animation Ring */}
                  <div className="absolute inset-0 -m-8 border-2 border-green-500/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 -m-16 border border-green-500/10 rounded-full animate-ping delay-100"></div>
              </div>
              
              <div className="w-full max-w-xs text-center space-y-4">
                  <p className="text-2xl font-bold text-gray-800 leading-tight">
                      "{liveTranscript}"
                  </p>
                  <div className="h-1 w-20 bg-gray-100 mx-auto rounded-full overflow-hidden">
                      {loading && <div className="h-full bg-green-500 animate-progress"></div>}
                  </div>
              </div>
           </div>

           {/* Live Footer */}
           <div className="pb-8 flex flex-col items-center gap-4">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tap to Disconnect</p>
               <button onClick={stopLiveSession} className="bg-red-500 text-white p-6 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all">
                   <Power size={32} />
               </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
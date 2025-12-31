
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Sparkles, AudioLines, X, Activity, Power, BookmarkPlus, Settings2, Check } from 'lucide-react';
import { chatWithCoach } from '../services/geminiService';
import { ChatMessage, JournalEntry, Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";

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

const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Coach Kore', type: 'Calm' },
  { id: 'Charon', label: 'Coach Mike', type: 'Bold' },
  { id: 'Fenrir', label: 'MasterGrowbot', type: 'Synthetic' },
  { id: 'Puck', label: 'Coach Puck', type: 'Energetic' },
];

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Greetings. I am MasterGrowbot. How is your garden thriving today?", isUser: false, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isLive, setIsLive] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages); 

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputIdRef = useRef<string | null>(null);
  const currentOutputIdRef = useRef<string | null>(null);
  const currentInputTextRef = useRef<string>("");
  const currentOutputTextRef = useRef<string>("");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isLive, connectionState]);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), text, isUser: true, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => ({
      role: m.isUser ? "user" : "model",
      parts: [{ text: m.text }]
    }));
    
    const context = {
        plant: plant,
        userProfile: userProfile || undefined
    };

    const response = await chatWithCoach(text, history, context);
    
    const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: response, isUser: false, timestamp: Date.now() };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  const saveMessageToJournal = (text: string) => {
      if (onSaveToJournal) {
          const contextMsg = messages[messages.length - 2]?.isUser ? messages[messages.length - 2].text : "AI Chat Advice";
          onSaveToJournal({
              type: 'chat',
              title: "Coach Advice",
              originalQuestion: contextMsg,
              notes: text
          });
      }
  };

  const startLiveSession = async () => {
    try {
      setConnectionState('connecting');
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      nextStartTimeRef.current = outputCtx.currentTime;

      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      if (inputCtx.state === 'suspended') {
          await inputCtx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }});
      streamRef.current = stream;
      
      let baseInstruction = `You are MasterGrowbot, a expert cultivation assistant. You are helping a user with their garden. `;
      if (selectedVoice === 'Fenrir') {
         baseInstruction += "Speak in a slightly technical, precise manner. Affirmative protocols active. ";
      } else {
         baseInstruction += "Be friendly and encouraging. ";
      }

      if (userProfile) {
          baseInstruction += `User is growing ${userProfile.grow_mode} with ${userProfile.experience} experience. `;
      }
      
      const fullSystemInstruction = `${baseInstruction} Be concise for voice chat.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: fullSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setConnectionState('connected');
            setLiveTranscript("Listening...");
            
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            handleLiveMessage(msg, outputCtx);
          },
          onclose: () => stopLiveSession(),
          onerror: (e) => stopLiveSession()
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err) {
      stopLiveSession();
    }
  };

  const stopLiveSession = () => {
    setIsLive(false);
    setConnectionState('disconnected');
    setLiveTranscript("");
    setIsUserSpeaking(false);
    
    if (sourcesRef.current) {
        sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
        sourcesRef.current.clear();
    }
    if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close());
        sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    
    currentInputIdRef.current = null;
    currentOutputIdRef.current = null;
    currentInputTextRef.current = "";
    currentOutputTextRef.current = "";
  };

  const handleLiveMessage = async (message: LiveServerMessage, ctx: AudioContext) => {
    const serverContent = message.serverContent;
    if (!serverContent) return;

    if (serverContent.interrupted) {
       sourcesRef.current.forEach((source) => { try { source.stop(); } catch (e) {} });
       sourcesRef.current.clear();
       nextStartTimeRef.current = ctx.currentTime;
    }

    if (serverContent.turnComplete) {
       currentInputIdRef.current = null;
       currentOutputIdRef.current = null;
       currentInputTextRef.current = "";
       currentOutputTextRef.current = "";
    }

    const base64Audio = serverContent.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      try {
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        sourcesRef.current.add(source);
        source.onended = () => sourcesRef.current.delete(source);
      } catch (e) {
        console.error(e);
      }
    }

    if (serverContent.inputTranscription?.text) {
       currentInputTextRef.current += serverContent.inputTranscription.text;
       setIsUserSpeaking(true);
       setLiveTranscript(currentInputTextRef.current);
       updateOrAddMessage(true, currentInputTextRef.current);
    }

    if (serverContent.outputTranscription?.text) {
        currentOutputTextRef.current += serverContent.outputTranscription.text;
        setIsUserSpeaking(false);
        setLiveTranscript(currentOutputTextRef.current);
        updateOrAddMessage(false, currentOutputTextRef.current);
    }
  };

  const updateOrAddMessage = (isUser: boolean, text: string) => {
     const idRef = isUser ? currentInputIdRef : currentOutputIdRef;
     if (!idRef.current) {
        const newId = Date.now().toString() + (isUser ? '-user' : '-ai');
        idRef.current = newId;
        const newMsg: ChatMessage = { id: newId, text, isUser, timestamp: Date.now() };
        setMessages(prev => [...prev, newMsg]);
     } else {
        setMessages(prev => prev.map(m => m.id === idRef.current ? { ...m, text } : m));
     }
  };

  return (
    <div className="flex flex-col h-full bg-surface pb-24 relative overflow-hidden font-sans">
      <div className="bg-white/90 backdrop-blur border-b border-gray-100 p-4 pt-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <div className="relative">
                <Growbot size="sm" mood={loading ? 'thinking' : 'happy'} />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-2 border-white rounded-full bg-primary"></div>
            </div>
            <div>
            <h1 className="font-bold text-text-main text-lg leading-none">MasterGrowbot</h1>
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider mt-1">AI Cultivation Coach</p>
            </div>
        </div>
        <div className="relative">
            <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className="p-2 text-text-sub hover:text-primary transition-colors bg-gray-50 rounded-full border border-gray-100">
                <Settings2 size={20} />
            </button>
            {showVoiceSettings && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-50 mb-1">Select Voice</p>
                    {VOICE_OPTIONS.map(v => (
                        <button key={v.id} onClick={() => { setSelectedVoice(v.id); setShowVoiceSettings(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${selectedVoice === v.id ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-text-main'}`}>
                            {v.label} {selectedVoice === v.id && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className="max-w-[85%] group relative">
                <div className={`p-4 text-sm leading-relaxed shadow-sm ${msg.isUser ? 'bg-text-main text-white rounded-2xl rounded-tr-sm' : 'bg-white text-text-main rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                {msg.text}
                </div>
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start pl-4"><div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div></div>}
        <div ref={endRef} />
      </div>
      <div className="px-4 py-2 overflow-x-auto whitespace-nowrap no-scrollbar z-20 mb-1">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button key={prompt} onClick={() => handleSend(prompt)} className="inline-flex items-center gap-1.5 mr-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs text-text-main font-bold shadow-sm">{prompt}</button>
          ))}
      </div>
      <div className="p-4 bg-white/80 backdrop-blur-lg border-t border-gray-100 z-30 pb-6">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[24px] px-2 py-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(input)} placeholder="Ask MasterGrowbot..." className="flex-1 bg-transparent outline-none text-sm text-text-main ml-2" />
          <button onClick={startLiveSession} className="p-2 rounded-full text-text-sub hover:text-primary"><AudioLines size={20} /></button>
          <button onClick={() => handleSend(input)} disabled={loading || !input.trim()} className={`w-9 h-9 rounded-full flex items-center justify-center ${input.trim() ? 'bg-text-main text-white' : 'bg-gray-200 text-gray-400'}`}><Send size={16} /></button>
        </div>
      </div>
      {isLive && (
        <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-between p-6">
           <div className="w-full flex justify-between items-start">
               <span className="text-primary font-mono text-xs uppercase tracking-widest animate-pulse">Live Uplink Active</span>
               <button onClick={stopLiveSession} className="p-3 bg-gray-100 rounded-full"><X size={20} /></button>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center">
              <Growbot size="xl" mood={isUserSpeaking ? 'alert' : 'speaking'} />
              <p className="mt-8 text-xl font-medium text-text-main text-center">"{liveTranscript || "Listening..."}"</p>
           </div>
           <button onClick={stopLiveSession} className="bg-alert-red text-white p-6 rounded-full shadow-xl"><Power size={32} /></button>
        </div>
      )}
    </div>
  );
};

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    let binary = "";
    const len = int16.buffer.byteLength;
    const bytes = new Uint8Array(int16.buffer);
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      data: btoa(binary),
      mimeType: "audio/pcm;rate=16000",
    };
  }
  
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  
  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

export default Chat;

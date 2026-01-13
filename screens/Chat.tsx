import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, RefreshCcw } from 'lucide-react';
import { chatWithCoach } from '../services/geminiService';
import { ChatMessage, UserProfile, Plant } from '../types';
import Growbot from '../components/Growbot';

interface ChatProps {
    onSaveToJournal?: any;
    plant?: Plant;
    userProfile?: UserProfile | null;
}

const SUGGESTED_PROMPTS = [
  "Why are my leaves yellow?",
  "What is the best light cycle?",
  "How do I cure my buds?",
  "Check for mold symptoms"
];

const PERSONAS = [
  { id: 'MasterGrowbot', label: 'Master AI', desc: 'Balanced' },
  { id: 'Kore', label: 'Coach Kore', desc: 'Organic' },
  { id: 'Charon', label: 'Coach Mike', desc: 'Hydro' },
];

const Chat: React.FC<ChatProps> = ({ userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: '1', role: 'assistant', content: "Hello! I'm MasterGrowbot. How's the garden doing today?", timestamp: new Date() }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('MasterGrowbot');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = async (text: string = inputText) => {
    if (!text.trim()) return;
    
    const newMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsLoading(true);

    try {
        const responseText = await chatWithCoach(text, messages, selectedPersona);
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: new Date() };
        setMessages(prev => [...prev, botMsg]);
    } catch (e) {
        // ... error handling
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* 1. Persona Selector Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
          {PERSONAS.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full border text-xs font-bold transition-all ${selectedPersona === p.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                  {p.label} <span className="opacity-50 font-normal ml-1">| {p.desc}</span>
              </button>
          ))}
      </div>

      {/* 2. Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-primary/10'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-primary" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-text-main text-white rounded-tr-none' : 'bg-white text-text-main rounded-tl-none border border-gray-100'}`}>
                {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center"><Sparkles size={16} className="text-primary animate-pulse" /></div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 text-xs text-gray-400 font-bold tracking-widest animate-pulse">THINKING...</div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 pb-24">
        {/* Suggested Prompts (Only show if chat is short) */}
        {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar">
                {SUGGESTED_PROMPTS.map(prompt => (
                    <button key={prompt} onClick={() => handleSend(prompt)} className="flex-shrink-0 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                        {prompt}
                    </button>
                ))}
            </div>
        )}
        
        <div className="relative">
            <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your plants..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-12 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl shadow-md disabled:opacity-50"
            >
                <Send size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

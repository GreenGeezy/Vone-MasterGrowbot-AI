import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { sendMessage } from '../services/geminiService';
import { UserProfile } from '../types';

interface ChatProps {
  onSaveToJournal: (entry: any) => void;
  plant: any;
  userProfile: UserProfile | null;
}

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [messages, setMessages] = useState<Array<{role: string, text: string}>>([
    { role: 'model', text: `Greetings! I am MasterGrowbot. I see you are cultivating ${plant?.name || 'a plant'}. Ask me anything about lights, nutrients, or humidity.` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessage(input, plant, userProfile);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error: any) {
      alert(`AI Error: ${error.message || "Connection failed"}`);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the network. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Glassmorphism Header */}
      <div className="p-4 border-b border-white/20 bg-white/60 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
                <Bot size={24} />
            </div>
            <div>
                <h1 className="text-lg font-bold text-text-main flex items-center gap-2">
                    AI Coach <Sparkles size={14} className="text-yellow-500 fill-yellow-500" />
                </h1>
                <p className="text-xs text-gray-500 font-medium">Online • Gemini 2.5 Flash</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center mr-2 shadow-sm shrink-0">
                    <Bot size={16} className="text-primary" />
                </div>
            )}
            
            <div className={`max-w-[80%] p-4 text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-2xl rounded-tr-none' 
                : 'bg-white/80 backdrop-blur-md text-text-main border border-white/50 rounded-2xl rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
             <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center mr-2 shadow-sm">
                <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl rounded-tl-none border border-white/50 shadow-sm flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Thinking</span>
              <Loader2 size={12} className="animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-white/20 z-20 pb-8">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-inner">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about nutrients, lights, or pests..."
            className="flex-1 bg-transparent border-none outline-none text-sm p-2 text-text-main placeholder:text-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;

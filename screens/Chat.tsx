import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Plus, MessageSquare, Pin, Trash2, Paperclip, Menu, FileText, ChevronRight } from 'lucide-react';
import { sendMessage } from '../services/geminiService';
import {
  createChatSession,
  getChatSessions,
  saveChatMessage,
  getChatMessages,
  deleteChatSession,
  pinChatSession,
  uploadImage,
  ChatSession
} from '../services/dbService';
import { ChatMessage, Plant, UserProfile } from '../types';
import Growbot from '../components/Growbot';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface ChatProps {
  onSaveToJournal?: (entry: any) => void;
  plant?: Plant;
  userProfile?: UserProfile | null;
}

const SUGGESTED_PROMPTS = [
  "Fix yellow leaves 🍂",
  "Feeding schedule 💧",
  "Harvest window ✂️",
  "Prevent mold 🛡️"
];

const Chat: React.FC<ChatProps> = ({ onSaveToJournal, plant, userProfile }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Welcome, Grower! 🌿 I am MasterGrowbot AI. Select a chart or start a new one to begin.",
      timestamp: Date.now()
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ uri: string, type: 'image' | 'file', base64?: string, content?: string, mimeType?: string } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, attachment]);

  const loadSessions = async () => {
    const data = await getChatSessions();
    setSessions(data);
    if (!currentSessionId && data.length > 0) selectSession(data[0].id);
    else if (data.length === 0) startNewChat("General Advice");
  };

  const startNewChat = async (paramTitle?: string) => {
    const title = paramTitle || "New Conversation";
    const newSession = await createChatSession(title);
    if (newSession) {
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setMessages([{ id: 'init', role: 'assistant', content: "New session started. How can I help?", timestamp: Date.now() }]);
      setSidebarOpen(false);
    }
  };

  const selectSession = async (id: string) => {
    setCurrentSessionId(id);
    setLoading(true);
    const dbMessages = await getChatMessages(id);
    const uiMessages: ChatMessage[] = dbMessages.map(m => ({
      id: m.id, role: m.role, content: m.content, attachmentUrl: m.attachment_url, timestamp: new Date(m.created_at).getTime()
    }));
    setMessages(uiMessages.length ? uiMessages : [{ id: 'empty', role: 'assistant', content: "Ready to grow! Ask me anything.", timestamp: Date.now() }]);
    setLoading(false);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (e: any, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;
    await deleteChatSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) startNewChat();
  };

  const handlePinSession = async (e: any, id: string, currentPin: boolean) => {
    e.stopPropagation();
    await pinChatSession(id, !currentPin);
    loadSessions();
  };

  // --- FILE HANDLING ---
  const handlePickImage = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80, allowEditing: false, resultType: CameraResultType.Base64, source: CameraSource.Prompt
      });
      if (image.base64String) {
        setAttachment({ uri: image.webPath || '', type: 'image', base64: image.base64String });
      }
    } catch (error) { /* Cancelled */ }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    // Default to Base64 for everything (safest for PDF/Images/Excel if supported)
    // For text files, we can also use text, but consistency helps.
    reader.readAsDataURL(file);

    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      // result is "data:mime;base64,....."
      const base64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];

      setAttachment({
        uri: file.name,
        type: file.type.startsWith('image') ? 'image' : 'file',
        base64: base64,
        mimeType: mimeType
      });
    };
  };

  // --- MESSAGING ---
  const handleSend = async (text: string = input) => {
    if ((!text.trim() && !attachment)) return;

    // AUTO-CREATE SESSION IF MISSING
    let sessionId = currentSessionId;
    if (!sessionId) {
      setLoading(true);
      const newSession = await createChatSession("New Conversation");
      if (newSession) {
        sessionId = newSession.id;
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
      } else {
        console.error("Failed to create session");
        setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: "Could not start chat session. Check connection.", timestamp: Date.now() }]);
        setLoading(false);
        return;
      }
    }

    // VISUAL UPDATE
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      // Ensure we save the FULL data url for immediate display if it's an image
      attachmentUrl: attachment?.type === 'image' ? `data:${attachment.mimeType};base64,${attachment.base64}` : attachment?.uri,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const tempAttachment = attachment;
    setAttachment(null);
    setLoading(true);

    try {
      let uploadUrl = '';
      // If needed, upload to Supabase Storage for persistence (Optional/Advanced)
      if (tempAttachment?.type === 'image' && tempAttachment.base64) {
        try {
          const path = `${userProfile?.id || 'anon'}/${Date.now()}.jpg`;
          const url = await uploadImage(tempAttachment.base64, path);
          if (url) uploadUrl = url;
        } catch (e) { console.warn("Image upload failed, using local only"); }
      }

      await saveChatMessage(sessionId, 'user', text, uploadUrl || userMsg.attachmentUrl, tempAttachment?.type);

      const historyContext = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

      // NEW SEND MESSAGE CALL
      const responseText = await sendMessage(
        text,
        historyContext,
        tempAttachment ? {
          data: tempAttachment.base64!, // We stored base64 in handleFileSelect
          type: tempAttachment.type,
          mimeType: tempAttachment.mimeType!
        } : undefined
      );

      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      await saveChatMessage(sessionId, 'assistant', responseText);

    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: "Connection error. Please try again.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-white h-full relative font-sans">

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 width-72 bg-gray-50 border-r border-gray-200 z-50 transform transition-transform duration-300 w-72 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h2 className="font-black text-gray-800">History</h2>
          <button onClick={() => setSidebarOpen(false)}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-3">
          <button onClick={() => startNewChat()} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-transform">
            <Plus size={18} /> New Chat
          </button>
        </div>
        <div className="overflow-y-auto h-full pb-24 px-3 space-y-2">
          {sessions.map(s => (
            <div key={s.id} onClick={() => selectSession(s.id)} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${currentSessionId === s.id ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-100 border border-transparent'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentSessionId === s.id ? 'text-green-600' : 'text-gray-400'} />
                <span className={`text-sm font-bold truncate ${currentSessionId === s.id ? 'text-gray-900' : 'text-gray-600'}`}>{s.title}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => handlePinSession(e, s.id, s.is_pinned)} className={`p-1.5 rounded-full ${s.is_pinned ? 'text-orange-500 bg-orange-100 opacity-100' : 'text-gray-400 hover:bg-gray-200'}`}><Pin size={12} fill={s.is_pinned ? "currentColor" : "none"} /></button>
                <button onClick={(e) => handleDeleteSession(e, s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}

      {/* MAIN CHAT */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative w-full">
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 p-4 pt-12 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Menu size={20} /></button>
            <div className="flex items-center gap-3">
              <Growbot size="sm" mood={loading ? 'thinking' : 'happy'} />
              <div>
                <h1 className="font-black text-gray-800 text-base leading-none">MasterGrowbot AI</h1>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">AI Cultivation Assistant</p>
              </div>
            </div>
          </div>
          <button onClick={() => startNewChat()} className="p-2 bg-green-50 text-green-600 rounded-full"><Plus size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              {msg.role === 'assistant' && (<div className="mr-2 flex-shrink-0"><Growbot size="sm" /></div>)}
              <div className={`max-w-[85%] space-y-2`}>
                <div className={`p-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-gray-900 text-white rounded-2xl rounded-tr-sm' : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'}`}>
                  {msg.attachmentUrl && (
                    msg.attachmentUrl.includes('jpg') || msg.attachmentUrl.includes('png') || msg.attachmentUrl.startsWith('data:') ?
                      <img src={msg.attachmentUrl} className="w-full h-32 object-cover rounded-lg mb-2" alt="attachment" />
                      : <div className="bg-white/10 p-2 rounded mb-2 text-xs flex items-center gap-2"><FileText size={14} /> Attached Document</div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                <div className={`text-[10px] text-gray-300 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start pl-12"><div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-150"></div></div></div>}
          <div ref={endRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          {attachment && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl mb-3 border border-gray-200 relative">
              <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110"><X size={12} /></button>
              {attachment.type === 'image' ? (
                <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden"><img src={`data:image/jpeg;base64,${attachment.base64}`} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center"><FileText size={20} /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{attachment.uri}</p>
                <p className="text-[10px] text-gray-400">Ready to upload</p>
              </div>
            </div>
          )}
          {!attachment && messages.length < 3 && (
            <div className="flex overflow-x-auto pb-3 gap-2 no-scrollbar">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => handleSend(p)} className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-green-500 hover:text-green-600 transistion-colors">{p}</button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-2 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
            <button onClick={handlePickImage} className="p-3 text-gray-400 hover:text-green-600 hover:bg-white rounded-full transition-colors"><ImageIcon size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-white rounded-full transition-colors"><Paperclip size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".txt,.md,.js,.pdf,.csv,.xlsx,.doc,.docx" />
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask about your plants..." rows={1} className="flex-1 bg-transparent py-3 px-2 outline-none text-sm text-gray-800 placeholder-gray-400 resize-none max-h-32 min-h-[44px]" />
            <button onClick={() => handleSend()} disabled={loading || (!input.trim() && !attachment)} className={`p-3 rounded-full transition-all ${input.trim() || attachment ? 'bg-black text-white shadow-lg hover:scale-105 active:scale-95' : 'bg-gray-200 text-gray-400'}`}><Send size={18} className={input.trim() || attachment ? 'ml-0.5' : ''} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
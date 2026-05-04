
import { supabase } from './supabaseClient';
import { GrowTask } from '../types';

// --- Local Storage Helpers ---

const STORAGE_KEYS = {
  CHAT_SESSIONS: 'mg_local_chat_sessions',
  CHAT_MESSAGES: 'mg_local_chat_messages',
  TASKS: 'mg_local_tasks',
  JOURNAL: 'mg_local_journal',
  TICKETS: 'mg_local_tickets',
  FEEDBACK: 'mg_local_feedback',
  CUSTOM_STRAINS: 'mg_custom_strains'
};

const getLocal = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};

const setLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Helper to convert Base64 string to Blob for upload.
 */
const base64ToBlob = (base64: string, contentType: string = 'image/jpeg'): Blob => {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

/**
 * Uploads an image to Supabase Storage 'user_uploads' bucket.
 * For anonymous users, this returns null (local images handled via base64 in UI).
 */
export const uploadImage = async (base64: string, path: string): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null; // Should not trigger now due to anon auth

    const blob = base64ToBlob(base64);
    const { error: uploadError } = await supabase.storage
      .from('user_uploads')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('user_uploads').getPublicUrl(path);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

/**
 * Saves a new entry to the journal_logs table (or Local Storage).
 */
export const saveJournalEntry = async (entry: {
  plant_id: string;
  entry_type: 'text' | 'photo' | 'draw' | 'diagnosis' | 'chat';
  content: string;
  media_url?: string;
  tags: string[];
}) => {
  const { data: { session } } = await supabase.auth.getSession();

  const newEntry = {
    user_id: session?.user.id,
    plant_id: entry.plant_id,
    entry_type: entry.entry_type,
    content: entry.content,
    media_url: entry.media_url,
    tags: entry.tags,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('journal_logs')
    .insert(newEntry)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

// --- Task Management System ---

export const getPendingTasksForToday = async (): Promise<GrowTask[] | null> => {
  // FIX (Step 2): Always read the freshest session. If anon sign-in has not
  // yet resolved, bail out quietly rather than sending a request without a
  // user_id filter (which would 400 or leak rows under permissive RLS).
  const { data: { session } } = await supabase.auth.getSession();
  const today = new Date().toISOString().split('T')[0];

  if (!session?.user?.id) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .lte('due_date', today)
    .eq('is_completed', false)
    .order('due_date', { ascending: true });

  if (error) return [];

  return (data || []).map((t: any) => ({
    id: t.id,
    plantId: t.plant_id,
    title: t.title,
    isCompleted: t.is_completed,
    completed: t.is_completed,
    dueDate: t.due_date,
    source: t.source,
    createdAt: t.created_at,
    type: t.type
  }));
};

export const addNewTask = async (task: Omit<GrowTask, 'id' | 'completed' | 'isCompleted' | 'createdAt'>): Promise<GrowTask | null> => {
  // FIX (Step 3): Without a session.user.id, Postgres rejects the NOT NULL
  // user_id constraint with a 400. Guard first — callers already handle null.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    console.warn('addNewTask: no authenticated session, skipping DB insert');
    return null;
  }

  // FIX (Step 3): Normalize due_date to a YYYY-MM-DD string. Postgres `date`
  // columns reject ISO datetimes with 'T' in them under strict configurations.
  const normalizedDueDate = typeof task.dueDate === 'string' && task.dueDate.includes('T')
    ? task.dueDate.split('T')[0]
    : task.dueDate;

  const newTaskObj = {
    user_id: session.user.id,
    plant_id: task.plantId ?? null,
    title: task.title,
    is_completed: false,
    due_date: normalizedDueDate,
    source: task.source,
    type: task.type || 'other',
    recurrence: task.recurrence || null,
    notes: task.notes || null,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTaskObj)
    .select()
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('addNewTask insert error:', error);
    return null;
  }

  return {
    id: data.id,
    plantId: data.plant_id,
    title: data.title,
    isCompleted: data.is_completed,
    completed: data.is_completed,
    dueDate: data.due_date,
    source: data.source,
    createdAt: data.created_at,
    type: data.type,
    recurrence: data.recurrence,
    notes: data.notes
  };
};

export const toggleTaskCompletion = async (taskId: string, isCompleted: boolean): Promise<boolean> => {
  // FIX (Step 3): Guard against optimistic local task IDs that never reached
  // the server (e.g. offline, or before session resolved). Don't send bogus
  // UUID-shaped requests that return 400.
  if (!taskId || taskId.startsWith('local_') || /^\d+$/.test(taskId)) return true;

  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: Boolean(isCompleted) })
    .eq('id', taskId);

  if (error) console.error('toggleTaskCompletion error:', error);
  return !error;
};

export const updateTaskProperties = async (taskId: string, updates: any): Promise<boolean> => {
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
  if (error) {
    console.error("Error updating task:", error);
    return false;
  }
  return true;
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error("Error deleting task:", error);
    return false;
  }
  return true;
};

export const deleteJournalEntry = async (entryId: string): Promise<boolean> => {
  const { error } = await supabase.from('journal_logs').delete().eq('id', entryId);
  if (error) {
    console.error("Error deleting journal entry:", error);
    return false;
  }
  return true;
};

export const deletePlant = async (plantId: string): Promise<boolean> => {
  // A Plant deletion conceptually would delete its tasks and logs too in a real relational setup.
  // Given the current mixed local/cloud structure, we provide the hook for the DB, but App.tsx handles the cascading local state.
  if (plantId.startsWith('local_') || plantId.length < 5) {
    // Local IDs or numeric indices like '1' used temporarily
    return true;
  }

  try {
    const { error } = await supabase.from('plants').delete().eq('id', plantId);
    if (error) console.warn("Supabase plant delete error:", error);
  } catch (e) {
    console.warn("Plant deletion network error:", e);
  }
  return true; // We always return true here to ensure UI clears it regardless of cloud sync status for this specific MVP architecture.
};

// --- Support & Feedback ---

export const createSupportTicket = async (ticket: { name: string, email: string, issue: string, message: string }) => {
  const { data: { session } } = await supabase.auth.getSession();

  // Submit to DB if possible (RLS might allow anon insert, check policy)
  // If strict RLS, we fallback to just returning success since Email is the primary channel.
  try {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: session?.user.id || null,
      name: ticket.name,
      email: ticket.email,
      issue: ticket.issue,
      message: ticket.message,
      status: 'open',
      created_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();
    if (!error) return data;
  } catch (e) { console.warn("Support DB insert failed (anon)", e); }

  // Fallback: Store locally just for record
  const tickets = getLocal(STORAGE_KEYS.TICKETS);
  tickets.push({ ...ticket, id: `local_${Date.now()}`, created_at: new Date().toISOString() });
  setLocal(STORAGE_KEYS.TICKETS, tickets);
  return { id: 'local-ticket' };
};

export const submitUserFeedback = async (feedback: { rating: number, message: string }) => {
  const { data: { session } } = await supabase.auth.getSession();
  try {
  const { data, error } = await supabase
    .from('user_feedback')
    .insert({
      user_id: session?.user.id || null,
      rating: feedback.rating,
      message: feedback.message,
      created_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();
    if (!error) return data;
  } catch (e) { console.warn("Feedback DB insert failed (anon)", e); }
  return { id: 'local-feedback' };
};

export const submitAppRating = async (rating: number) => {
  const { data: { session } } = await supabase.auth.getSession();
  try {
    await supabase.from('app_ratings').insert({
      user_id: session?.user.id || null,
      rating: rating,
      created_at: new Date().toISOString()
    });
  } catch (e) { /* ignore */ }
  return { id: 'local-rating' };
};

// --- Chat History System (Mixed Mode) ---

export interface ChatSession {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
}

export interface StoredMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
}

export const createChatSession = async (title: string = "New Conversation"): Promise<ChatSession | null> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return createLocalSession(title);
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: session.user.id, title })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Create Session Error (Cloud):", error);
    // FALLBACK: If cloud fails, create local session instead of blocking the user
    return createLocalSession(title);
  }
  return data;
};

const createLocalSession = (title: string): ChatSession => {
  const newSession = {
    id: `local_session_${Date.now()}`,
    title,
    is_pinned: false,
    created_at: new Date().toISOString()
  };
  const sessions = getLocal(STORAGE_KEYS.CHAT_SESSIONS);
  sessions.unshift(newSession);
  setLocal(STORAGE_KEYS.CHAT_SESSIONS, sessions);
  return newSession;
};

// --- Custom Strains System ---

export const getCustomStrains = (): any[] => {
  return getLocal(STORAGE_KEYS.CUSTOM_STRAINS);
};

export const saveCustomStrain = (strain: any): any => {
  const strains = getLocal(STORAGE_KEYS.CUSTOM_STRAINS);
  const newStrain = { ...strain, id: `custom_${Date.now()}`, userCreated: true };
  strains.unshift(newStrain); // Add to top
  setLocal(STORAGE_KEYS.CUSTOM_STRAINS, strains);
  return newStrain;
};

export const deleteCustomStrain = (id: string) => {
  const strains = getLocal(STORAGE_KEYS.CUSTOM_STRAINS);
  const updated = strains.filter((s: any) => s.id !== id);
  setLocal(STORAGE_KEYS.CUSTOM_STRAINS, updated);
};


export const getChatSessions = async (): Promise<ChatSession[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  let sessions: ChatSession[] = [];

  // 1. Load Local
  const localSessions = getLocal(STORAGE_KEYS.CHAT_SESSIONS);
  sessions = [...localSessions];

  // 2. Load Cloud (if logged in)
  if (session) {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) sessions = [...sessions, ...data];
  }

  // Sort combined
  return sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const deleteChatSession = async (sessionId: string) => {
  if (sessionId.startsWith('local_')) {
    const sessions = getLocal(STORAGE_KEYS.CHAT_SESSIONS);
    setLocal(STORAGE_KEYS.CHAT_SESSIONS, sessions.filter((s: any) => s.id !== sessionId));
    return;
  }
  await supabase.from('chat_sessions').delete().eq('id', sessionId);
};

export const pinChatSession = async (sessionId: string, isPinned: boolean) => {
  if (sessionId.startsWith('local_')) {
    const sessions = getLocal(STORAGE_KEYS.CHAT_SESSIONS);
    const updated = sessions.map((s: any) => s.id === sessionId ? { ...s, is_pinned: isPinned } : s);
    setLocal(STORAGE_KEYS.CHAT_SESSIONS, updated);
    return;
  }
  await supabase.from('chat_sessions').update({ is_pinned: isPinned }).eq('id', sessionId);
};

export const saveChatMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  attachmentUrl?: string,
  attachmentType?: string
): Promise<StoredMessage | null> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType
    })
    .select()
    .maybeSingle();

  if (error) { console.error("Save Message Error:", error); return null; }
  return data;
};

export const getChatMessages = async (sessionId: string): Promise<StoredMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
};

// --- Account Deletion ---

export const deleteUserData = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Clear Local Storage
  localStorage.clear();

  // 2. Delete from Supabase (if authenticated)
  if (session?.user?.id) {
    const uid = session.user.id;
    try {
      // Execute deletions in parallel for speed, handle potential errors gracefully
      await Promise.all([
        supabase.from('profiles').delete().eq('id', uid),
        supabase.from('grow_logs').delete().eq('user_id', uid), // Assuming this is the table name from user request
        supabase.from('journal_logs').delete().eq('user_id', uid),
        supabase.from('tasks').delete().eq('user_id', uid),
        supabase.from('chat_sessions').delete().eq('user_id', uid),
        supabase.from('chat_messages').delete().eq('user_id', uid), // Dependent on session usually, but for completeness
        supabase.from('user_feedback').delete().eq('user_id', uid),
        supabase.from('support_tickets').delete().eq('user_id', uid),
        supabase.auth.signOut()
      ]);
      return true;
    } catch (e) {
      console.error("Error deleting user data from Supabase:", e);
      // Even if DB fails (e.g. network), we treated local clear as success for the user's perception on this device
      return false;
    }
  }

  return true; // Local only account deleted
};

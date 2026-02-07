
import { supabase } from './supabaseClient';
import { GrowTask } from '../types';

/**
 * Helper to convert Base64 string to Blob for upload.
 */
const base64ToBlob = (base64: string, contentType: string = 'image/jpeg'): Blob => {
  // Handle both data URI scheme and raw base64 strings
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
 * @param base64 The base64 string of the image.
 * @param path The target file path (e.g., 'folder/filename.jpg').
 * @returns The public URL of the uploaded file.
 */
export const uploadImage = async (base64: string, path: string): Promise<string | null> => {
  if (!supabase) return null;
  try {
    const blob = base64ToBlob(base64);

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('user_uploads')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Upload Error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user_uploads')
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

/**
 * Saves a new entry to the journal_logs table.
 */
export const saveJournalEntry = async (entry: {
  plant_id: string;
  entry_type: 'text' | 'photo' | 'draw' | 'diagnosis' | 'chat';
  content: string;
  media_url?: string;
  tags: string[];
}) => {
  if (!supabase) throw new Error("Supabase connection unavailable");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('journal_logs')
    .insert({
      user_id: user.id,
      plant_id: entry.plant_id,
      entry_type: entry.entry_type,
      content: entry.content,
      media_url: entry.media_url,
      tags: entry.tags,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- Task Management System ---

/**
 * Fetches pending tasks for the current user for today specific date.
 */
export const getPendingTasksForToday = async (): Promise<GrowTask[] | null> => {
  if (!supabase) return [];
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .lte('due_date', today)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

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

  } catch (e) {
    console.error("Task Fetch Exception:", e);
    return [];
  }
};

/**
 * Adds a new task.
 */
export const addNewTask = async (task: Omit<GrowTask, 'id' | 'completed' | 'isCompleted' | 'createdAt'>): Promise<GrowTask | null> => {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const newTask = {
      user_id: user.id,
      plant_id: task.plantId,
      title: task.title,
      is_completed: false,
      due_date: task.dueDate,
      source: task.source,
      type: task.type || 'other',
      recurrence: task.recurrence || null, // New Field
      notes: task.notes || null,           // New Field
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single();

    if (error) {
      console.error("Add Task Error:", error);
      return null; // Return null instead of crashing
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
      recurrence: data.recurrence, // Return new field
      notes: data.notes            // Return new field
    };

  } catch (e) {
    console.error("Task Add Exception:", e);
    return null;
  }
};

/**
 * Toggles task completion status.
 */
export const toggleTaskCompletion = async (taskId: string, isCompleted: boolean): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: isCompleted })
      .eq('id', taskId);

    if (error) {
      console.error("Toggle Task Error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Toggle Task Exception:", e);
    return false;
  }
};

// --- Support & Feedback ---

export const createSupportTicket = async (ticket: { name: string, email: string, issue: string, message: string }) => {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user?.id || null, // Allow generic support even if auth fails, ideally
        name: ticket.name,
        email: ticket.email,
        issue: ticket.issue,
        message: ticket.message,
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return null;
  }
};

export const submitUserFeedback = async (feedback: { rating: number, message: string }) => {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: user.id,
        rating: feedback.rating,
        message: feedback.message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return null;
  }
};

export const submitAppRating = async (rating: number) => {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('app_ratings')
      .insert({
        user_id: user.id,
        rating: rating,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting rating:', error);
    return null;
  }
};
// --- Chat History System ---

export interface ChatSession {
  id: string;
  title: string;
  is_pinned: boolean; // Note snake_case from DB
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

/**
 * Creates a new chat session.
 */
export const createChatSession = async (title: string = "New Conversation"): Promise<ChatSession | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title: title
    })
    .select()
    .single();

  if (error) {
    console.error("Create Session Error:", error);
    return null;
  }
  return data;
};

/**
 * Gets all chat sessions for the user.
 */
export const getChatSessions = async (): Promise<ChatSession[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
};

/**
 * Deletes a chat session.
 */
export const deleteChatSession = async (sessionId: string) => {
  if (!supabase) return;
  await supabase.from('chat_sessions').delete().eq('id', sessionId);
};

/**
 * Toggle Pin status.
 */
export const pinChatSession = async (sessionId: string, isPinned: boolean) => {
  if (!supabase) return;
  await supabase.from('chat_sessions').update({ is_pinned: isPinned }).eq('id', sessionId);
};

/**
 * Saves a message to a session.
 */
export const saveChatMessage = async (
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  attachmentUrl?: string,
  attachmentType?: string
): Promise<StoredMessage | null> => {
  if (!supabase) return null;

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
    .single();

  if (error) {
    console.error("Save Message Error:", error);
    return null;
  }
  return data;
};

/**
 * Gets messages for a specific session.
 */
export const getChatMessages = async (sessionId: string): Promise<StoredMessage[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
};


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
      type: data.type
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


import { supabase } from './supabaseClient';

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

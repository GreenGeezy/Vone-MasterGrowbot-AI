import { DiagnosisResult, JournalEntry } from "../types";

const MOCK_BASE_URL = "https://mastergrowbot.ai/share";

/**
 * Generates a mock public URL for a shared resource.
 * In a real backend, this would make an API call to store the data and return an ID.
 */
export const generatePublicLink = (type: 'report' | 'journal', id: string): string => {
  // Simulate a unique hash
  const hash = Math.random().toString(36).substring(7);
  return `${MOCK_BASE_URL}/${type}/${id}-${hash}`;
};

/**
 * Invokes the native Web Share API or falls back to clipboard.
 */
export const shareContent = async (
  title: string, 
  text: string, 
  url: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' }> => {
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: text,
        url: url,
      });
      return { success: true, method: 'native' };
    } catch (error) {
      console.log('Error sharing:', error);
      return { success: false, method: 'native' };
    }
  } else {
    // Fallback to Clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      return { success: true, method: 'clipboard' };
    } catch (err) {
      console.error('Could not copy text: ', err);
      return { success: false, method: 'clipboard' };
    }
  }
};

/**
 * Formats a diagnosis result into a shareable string.
 */
export const formatDiagnosisForShare = (result: DiagnosisResult, strain?: string): string => {
  return `MasterGrowbot AI Report 🌿\n\nDiagnosis: ${result.diagnosis}\nHealth: ${result.health}\nAction: ${result.topAction}\n\nView full recovery plan here:`;
};
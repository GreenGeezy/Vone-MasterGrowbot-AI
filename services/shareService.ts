import { DiagnosisResult } from "../types";

const MOCK_BASE_URL = "https://mastergrowbot.ai/share";

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
export const formatDiagnosisForShare = (result: DiagnosisResult): string => {
  return `MasterGrowbot AI Report 🌿\n\nDiagnosis: ${result.diagnosis}\nSeverity: ${result.severity.toUpperCase()}\nConfidence: ${result.confidence}%\n\nPriority Action: ${result.topAction}\n\nView full recovery plan on MasterGrowbot AI.`;
};

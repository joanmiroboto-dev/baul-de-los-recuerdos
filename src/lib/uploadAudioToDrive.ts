import { supabase } from '@/integrations/supabase/client';

interface UploadResult {
  success: boolean;
  fileId?: string;
  audioUrl?: string;
  error?: string;
}

export async function uploadAudioToDrive(
  audioBlob: Blob,
  userId: string
): Promise<UploadResult> {
  try {
    // Determine file extension based on blob type
    const mimeType = audioBlob.type || 'audio/webm';
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `audio-comment-${userId}-${Date.now()}.${extension}`;
    
    const file = new File([audioBlob], fileName, { type: mimeType });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    // Don't send title to use "simple upload mode" in the edge function
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'No hay sesión activa. Por favor, inicia sesión.' };
    }

    const response = await supabase.functions.invoke('upload-to-drive', {
      body: formData,
    });

    if (response.error) {
      console.error('Upload error:', response.error);
      return { success: false, error: response.error.message || 'Error al subir audio' };
    }

    const result = response.data;
    
    if (!result.success) {
      return { success: false, error: result.error || 'Error al subir audio a Google Drive' };
    }

    // Store only the fileId - the frontend will construct the proxy URL
    return {
      success: true,
      fileId: result.fileId,
      audioUrl: result.fileId, // Store fileId, not full URL
    };
  } catch (err) {
    console.error('Upload audio error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Error desconocido al subir audio' 
    };
  }
}

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
    const mimeType = audioBlob.type || 'audio/webm';
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `audios/${userId}-${Date.now()}.${extension}`;
    
    const file = new File([audioBlob], fileName, { type: mimeType });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'No hay sesión activa. Por favor, inicia sesión.' };
    }

    const { error: uploadError } = await supabase.storage
      .from('memories')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('memories')
      .getPublicUrl(fileName);

    return {
      success: true,
      fileId: publicUrl,
      audioUrl: publicUrl,
    };
  } catch (err) {
    console.error('Upload audio error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Error desconocido al subir audio' 
    };
  }
}

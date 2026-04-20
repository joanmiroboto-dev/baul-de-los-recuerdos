import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: 'fileId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Proxying audio for fileId: ${fileId}`);

    // Google Drive direct download URL
    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // Fetch from Google Drive, following redirects
    const response = await fetch(driveUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AudioProxy/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Google Drive fetch failed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audio from Google Drive' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content type from response, default to audio/webm
    const contentType = response.headers.get('Content-Type') || 'audio/webm';
    const contentLength = response.headers.get('Content-Length');

    console.log(`Streaming audio: ${contentType}, size: ${contentLength || 'unknown'}`);

    // Stream the audio back with proper CORS headers
    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new Response(response.body, { headers });

  } catch (error: unknown) {
    console.error('Audio proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

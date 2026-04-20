import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Refresh OAuth access token using refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials');
  }

  console.log('Refreshing OAuth access token...');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh error:', errorText);
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();
  console.log('Token refreshed successfully');
  return { access_token: data.access_token, expires_in: data.expires_in };
}

// Convert Uint8Array to base64 safely for large files
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(result);
}

// Upload file to user's Google Drive
async function uploadToGoogleDrive(
  accessToken: string,
  fileData: Uint8Array,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ id: string; webViewLink: string; webContentLink?: string }> {
  console.info(`Uploading to Google Drive: ${fileName}, size: ${fileData.length}`);

  const metadata: Record<string, unknown> = {
    name: fileName,
  };

  // If a folder ID is provided, upload to that folder
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataString = JSON.stringify(metadata);
  
  const encoder = new TextEncoder();
  const metadataPart = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadataString}`
  );
  const filePart = encoder.encode(
    `${delimiter}Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
  );
  const fileDataBase64 = encoder.encode(uint8ArrayToBase64(fileData));
  const closePart = encoder.encode(closeDelimiter);

  const body = new Uint8Array(metadataPart.length + filePart.length + fileDataBase64.length + closePart.length);
  let offset = 0;
  body.set(metadataPart, offset); offset += metadataPart.length;
  body.set(filePart, offset); offset += filePart.length;
  body.set(fileDataBase64, offset); offset += fileDataBase64.length;
  body.set(closePart, offset);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Google Drive upload error:", error);
    throw new Error(`Failed to upload to Google Drive: ${error}`);
  }

  const result = await response.json();
  console.info("File uploaded successfully:", result.id);

  return {
    id: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID');

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Get user's Google OAuth tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('tokens_google')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.error('No Google tokens found for user:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Google Drive not connected',
          message: 'Please connect your Google Drive account first'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : new Date(0);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (!accessToken || expiresAt.getTime() - now.getTime() < bufferTime) {
      console.log('Access token expired or missing, refreshing...');
      
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      accessToken = refreshed.access_token;

      // Update token in database
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await supabaseAdmin
        .from('tokens_google')
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      console.log('Token updated in database');
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const customFileName = formData.get('fileName') as string | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || null;
    const memoryDate = formData.get('memory_date') as string;
    const memoryType = formData.get('memory_type') as string;
    const tagIdsRaw = formData.get('tag_ids') as string || null;
    
    let tagIds: string[] = [];
    if (tagIdsRaw) {
      try {
        tagIds = JSON.parse(tagIdsRaw);
      } catch (e) {
        console.log("Could not parse tag_ids:", e);
      }
    }

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: "No file provided" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const fileName = customFileName || file.name;
    console.info(`Uploading file: ${fileName}, type: ${file.type}, size: ${file.size}`);

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    // Upload to Google Drive using user's OAuth token
    const driveResult = await uploadToGoogleDrive(
      accessToken,
      fileData,
      fileName,
      file.type || 'application/octet-stream',
      folderId
    );

    console.info("File uploaded to Google Drive:", driveResult);

    // Make the file publicly readable so it can be displayed in the app
    try {
      const permissionResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${driveResult.id}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );

      if (!permissionResponse.ok) {
        const permError = await permissionResponse.text();
        console.warn("Could not set public permission:", permError);
      } else {
        console.info("File set to public readable");
      }
    } catch (permErr) {
      console.warn("Error setting file permissions:", permErr);
    }

    // Construct the direct view URL using lh3.googleusercontent.com for better embedding
    const fileUrl = `https://lh3.googleusercontent.com/d/${driveResult.id}`;
    
    // If no title provided, just return the drive result (simple upload mode)
    if (!title) {
      return new Response(
        JSON.stringify({
          success: true,
          fileId: driveResult.id,
          fileName: fileName,
          downloadUrl: `https://drive.google.com/uc?id=${driveResult.id}&export=download`,
          webViewLink: driveResult.webViewLink,
          webContentLink: driveResult.webContentLink
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Insert memory record
    const { data: memory, error: dbError } = await supabaseAdmin
      .from('memories')
      .insert({
        title,
        description,
        file_url: fileUrl,
        memory_type: memoryType,
        memory_date: memoryDate,
        uploaded_by: user.id,
        thumbnail_url: memoryType === 'image' ? fileUrl : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to save memory: ${dbError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.info("Memory saved:", memory.id);

    // Save tag associations
    if (tagIds.length > 0 && memory) {
      const memoryTagsData = tagIds.map(tagId => ({
        memory_id: memory.id,
        tag_id: tagId
      }));

      const { error: tagsError } = await supabaseAdmin
        .from('memory_tags')
        .insert(memoryTagsData);

      if (tagsError) {
        console.error("Error saving tags:", tagsError);
      } else {
        console.info("Tags saved:", tagIds.length);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId: driveResult.id,
        fileName: fileName,
        downloadUrl: `https://drive.google.com/uc?id=${driveResult.id}&export=download`,
        webViewLink: driveResult.webViewLink,
        webContentLink: driveResult.webContentLink,
        memory,
        driveFileId: driveResult.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

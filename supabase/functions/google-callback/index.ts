import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Get frontend URL for redirect
    const frontendUrl = Deno.env.get('SITE_URL') || 'https://cvqngjlbouvcszsnzbig.lovable.app';

    if (error) {
      console.error('Google OAuth error:', error);
      return Response.redirect(`${frontendUrl}/upload?google_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`${frontendUrl}/upload?google_error=missing_params`, 302);
    }

    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
    } catch (e) {
      console.error('Invalid state:', e);
      return Response.redirect(`${frontendUrl}/upload?google_error=invalid_state`, 302);
    }

    console.log('Processing callback for user:', userId);

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return Response.redirect(`${frontendUrl}/upload?google_error=${encodeURIComponent(tokenData.error)}`, 302);
    }

    console.log('Got tokens, refresh_token present:', !!tokenData.refresh_token);

    // Get user email from Google
    let googleEmail = null;
    if (tokenData.access_token) {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email;
        console.log('Google user email:', googleEmail);
      } catch (e) {
        console.error('Error getting user info:', e);
      }
    }

    // Store tokens using service role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate expiration time
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Upsert token record
    const { error: dbError } = await supabaseAdmin
      .from('tokens_google')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        google_email: googleEmail,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return Response.redirect(`${frontendUrl}/upload?google_error=db_error`, 302);
    }

    console.log('Tokens stored successfully for user:', userId);

    // Redirect back to frontend with success
    return Response.redirect(`${frontendUrl}/upload?google_connected=true`, 302);

  } catch (error) {
    console.error('Callback error:', error);
    const frontendUrl = Deno.env.get('SITE_URL') || 'https://cvqngjlbouvcszsnzbig.lovable.app';
    return Response.redirect(`${frontendUrl}/upload?google_error=server_error`, 302);
  }
});

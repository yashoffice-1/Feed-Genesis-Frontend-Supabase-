import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook verification (GET request)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    // Verify the webhook
    const verifyToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN') || 'instagram_webhook_token';
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.log('Webhook verification failed');
      return new Response('Forbidden', { status: 403 });
    }
  }

  try {
    const { action, code, state } = await req.json();
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const instagramClientId = Deno.env.get('INSTAGRAM_CLIENT_ID');
    const instagramClientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET');
    const redirectUri = Deno.env.get('INSTAGRAM_REDIRECT_URI') || `${supabaseUrl}/functions/v1/instagram-oauth`;

    if (!instagramClientId || !instagramClientSecret) {
      throw new Error('Instagram OAuth credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'get_auth_url') {
      // Generate authorization URL
      const authUrl = new URL('https://api.instagram.com/oauth/authorize');
      authUrl.searchParams.set('client_id', instagramClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'user_profile,user_media');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state || 'default_state');

      return new Response(JSON.stringify({
        success: true,
        auth_url: authUrl.toString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'exchange_code') {
      console.log('Exchanging code for access token:', code);

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: instagramClientId,
          client_secret: instagramClientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful, user_id:', tokenData.user_id);

      // Get long-lived access token
      const longLivedTokenResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramClientSecret}&access_token=${tokenData.access_token}`,
        { method: 'GET' }
      );

      if (!longLivedTokenResponse.ok) {
        console.warn('Long-lived token exchange failed, using short-lived token');
      }

      const longLivedTokenData = longLivedTokenResponse.ok 
        ? await longLivedTokenResponse.json()
        : { access_token: tokenData.access_token, expires_in: 3600 };

      // Get user profile information
      const profileResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${longLivedTokenData.access_token}`,
        { method: 'GET' }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profileData = await profileResponse.json();
      console.log('Profile data:', profileData);

      // Store in database
      const expiresAt = longLivedTokenData.expires_in 
        ? new Date(Date.now() + longLivedTokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days default

      const { data, error } = await supabase
        .from('user_social_connections')
        .upsert({
          user_id: state || 'default_user', // You might want to pass actual user ID
          platform: 'instagram',
          platform_user_id: profileData.id,
          platform_username: profileData.username,
          access_token: longLivedTokenData.access_token,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save connection');
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Instagram connected successfully',
        user: {
          username: profileData.username,
          id: profileData.id
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'disconnect') {
      const { data, error } = await supabase
        .from('user_social_connections')
        .delete()
        .eq('user_id', state || 'default_user')
        .eq('platform', 'instagram');

      if (error) {
        throw new Error('Failed to disconnect');
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Instagram disconnected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'check_connection') {
      const { data, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', state || 'default_user')
        .eq('platform', 'instagram')
        .single();

      return new Response(JSON.stringify({
        success: true,
        connected: !error && data,
        connection: data || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { log } from 'console';

export function YouTubeCallback() {
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const state = urlParams.get('state');

        if (error) {
          console.error('YouTube OAuth error:', error, errorDescription);
          // Send error to parent window
          window.opener?.postMessage({
            type: 'YOUTUBE_AUTH_ERROR',
            error: errorDescription || error
          }, window.location.origin);
          window.close();
          return;
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        console.log('Processing YouTube authorization code...');

        // Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: '912066635865-6rucscatfu2otov3s6clfnoh9hhuj9jh.apps.googleusercontent.com',
            client_secret: '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',
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: window.location.origin + '/youtube-callback',
          })
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('Token exchange failed:', errorData);
          throw new Error(errorData.error_description || 'Failed to exchange code for token');
        }

        const tokenData = await tokenResponse.json();
        console.log('Token exchange successful, getting channel info...');

        // Get YouTube channel information using the new token
        const channelResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(channelResponse);
        if (!channelResponse.ok) {
          const channelError = await channelResponse.json();
          console.error('Channel info request failed:', channelError);
          throw new Error(channelError.error?.message || 'Failed to get channel information');
        }

        const channelData = await channelResponse.json();
        const channel = channelData.items?.[0];

        if (!channel) {
          throw new Error('No YouTube channel found for this account');
        }

        console.log('Channel info retrieved:', channel.snippet.title);

        // Calculate token expiry time
        const expiresAt = tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour default

        const userInfo = {
          channelId: channel.id,
          channelTitle: channel.snippet.title,
          subscriberCount: channel.statistics?.subscriberCount || '0',
          videoCount: channel.statistics?.videoCount || '0'
        };

        // Prepare connection data
        const connectionData = {
          user_id: 'default_user',
          platform: 'youtube',
          platform_user_id: channel.id,
          platform_username: channel.snippet.title, // For backwards compatibility
          platform_display_name: channel.snippet.title, // Correct field name
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
          metadata: {
            subscriberCount: channel.statistics?.subscriberCount || '0',
            videoCount: channel.statistics?.videoCount || '0',
            channelDescription: channel.snippet.description,
            thumbnailUrl: channel.snippet.thumbnails?.default?.url
          }
        };

        // Store connection in database (no localStorage fallback)
        try {
          const { error: dbError } = await supabase
            .from('user_social_connections')
            .upsert(connectionData, {
              onConflict: 'user_id,platform'
            });

          if (dbError) {
            console.error('Database error:', dbError);
            throw new Error(`Database save failed: ${dbError.message}`);
          }

          console.log('YouTube connection saved to database successfully');

        } catch (dbError) {
          console.error('Failed to save YouTube connection to database:', dbError);
          throw new Error('Failed to save connection. Please try connecting again.');
        }

        // Send success to parent window
        window.opener?.postMessage({
          type: 'YOUTUBE_AUTH_SUCCESS',
          user: userInfo,
          token: tokenData.access_token
        }, window.location.origin);

        window.close();

      } catch (error) {
        console.error('YouTube callback error:', error);
        
        // Send error to parent window
        window.opener?.postMessage({
          type: 'YOUTUBE_AUTH_ERROR',
          error: error.message || 'Authentication failed'
        }, window.location.origin);
        
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Connecting to YouTube</h2>
        <p className="text-gray-600 mb-4">Please wait while we complete your authentication...</p>
        <div className="text-xs text-gray-500">
          <p>✓ Exchanging authorization code</p>
          <p>✓ Retrieving channel information</p>
          <p>✓ Saving connection data</p>
        </div>
      </div>
    </div>
  );
} 
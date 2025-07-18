import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface YouTubeAuthConfig {
  clientId: string;
  redirectUri: string;
}

interface YouTubeUserInfo {
  channelTitle: string;
  channelId: string;
  subscriberCount?: string;
  videoCount?: string;
}

export function useYouTubeAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<YouTubeUserInfo | null>(null);
  const { toast } = useToast();

  // YouTube OAuth configuration
  const config: YouTubeAuthConfig = {
    clientId: '912066635865-6rucscatfu2otov3s6clfnoh9hhuj9jh.apps.googleusercontent.com',
    redirectUri: window.location.origin + '/youtube-callback'
  };



  // Check for existing connection on initialization
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Only check Supabase database for connections
        const { data: connection, error } = await supabase
          .from('user_social_connections')
          .select('*')
          .eq('platform', 'youtube')
          .eq('user_id', 'default_user')
          .eq('is_active', true)
          .single();

        if (error) {
          console.log('No existing YouTube connection in database:', error.message);
          return;
        }

        if (connection) {
          // Check if token is still valid
          const tokenExpiry = new Date(connection.token_expires_at);
          const now = new Date();
          
          if (tokenExpiry > now) {
            const userInfo = {
              channelTitle: connection.platform_display_name || connection.platform_username || 'YouTube Channel',
              channelId: connection.platform_user_id || '',
              subscriberCount: '0',
              videoCount: '0'
            };

            setIsConnected(true);
            setUserInfo(userInfo);
          } else {
            // Token expired, remove connection
            await supabase
              .from('user_social_connections')
              .delete()
              .eq('id', connection.id);
          }
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
        // Don't fallback to localStorage - if database fails, user needs to reconnect
      }
    };

    checkExistingConnection();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Generate YouTube OAuth URL with proper scopes
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', Math.random().toString(36).substring(7));

      console.log('Generated YouTube OAuth URL:', authUrl.toString());

      // Open popup window
      const popup = window.open(
        authUrl.toString(),
        'youtube-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
          setIsConnected(true);
          setUserInfo(event.data.user);
          popup?.close();
          
          toast({
            title: "YouTube Connected!",
            description: `Successfully connected to ${event.data.user.channelTitle}`,
          });

          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'YOUTUBE_AUTH_ERROR') {
          popup?.close();
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect YouTube account",
            variant: "destructive",
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to open YouTube authentication",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [config.clientId, config.redirectUri, toast]);

  const disconnect = useCallback(async () => {
    try {
      // Clear local state
      setIsConnected(false);
      setUserInfo(null);
      
      // No localStorage to clear since we only use Supabase now
      
      // Try to clear from database (don't fail if this doesn't work)
      try {
        await supabase
          .from('user_social_connections')
          .delete()
          .eq('platform', 'youtube')
          .eq('user_id', 'default_user');
      } catch (dbError) {
        console.warn('Failed to remove from database:', dbError);
      }

      toast({
        title: "YouTube Disconnected",
        description: "Successfully disconnected from YouTube",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect YouTube account",
        variant: "destructive",
      });
    }
  }, [toast]);

  const uploadVideo = useCallback(async (videoFile: File, title: string, description: string, tags: string[] = []) => {
    if (!isConnected || !userInfo) {
      throw new Error('YouTube not connected');
    }

    try {
      // Try to get access token from database first, then local storage
      let accessToken: string | null = null;
      
      try {
        const { data: connection } = await supabase
          .from('user_social_connections')
          .select('access_token, token_expires_at')
          .eq('platform', 'youtube')
          .eq('user_id', 'default_user')
          .eq('is_active', true)
          .single();

        if (connection?.access_token) {
          // Check if token is still valid
          const tokenExpiry = new Date(connection.token_expires_at);
          const now = new Date();
          
          if (tokenExpiry > now) {
            accessToken = connection.access_token;
          } else {
            throw new Error('Database token has expired');
          }
        }
      } catch (dbError) {
        console.error('Failed to get token from database:', dbError);
        throw new Error('No valid YouTube access token found. Please reconnect your account.');
      }

      if (!accessToken) {
        throw new Error('No valid YouTube access token found. Please reconnect your account.');
      }

      // Create video metadata according to YouTube API v3 specification
      const metadata = {
        snippet: {
          title: title,
          description: description,
          tags: tags,
          categoryId: '22', // People & Blogs category
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: 'public', // Can be 'private', 'public', or 'unlisted'
          selfDeclaredMadeForKids: false
        }
      };

      // Initialize resumable upload
      const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': videoFile.size.toString(),
          'X-Upload-Content-Type': videoFile.type
        },
        body: JSON.stringify(metadata)
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        throw new Error(`Upload initiation failed: ${errorData.error?.message || initResponse.statusText}`);
      }

      const uploadUrl = initResponse.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('No upload URL received from YouTube');
      }

      // Upload the video file in chunks for better reliability
      const chunkSize = 1024 * 1024 * 5; // 5MB chunks
      let start = 0;
      let uploadComplete = false;
      let result: any = null;

      while (!uploadComplete) {
        const end = Math.min(start + chunkSize, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': chunk.size.toString(),
            'Content-Range': `bytes ${start}-${end - 1}/${videoFile.size}`,
            'Content-Type': videoFile.type
          },
          body: chunk
        });

        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
          // Upload complete
          result = await uploadResponse.json();
          uploadComplete = true;
        } else if (uploadResponse.status === 308) {
          // Continue upload
          const range = uploadResponse.headers.get('Range');
          if (range) {
            const rangeEnd = parseInt(range.split('-')[1]);
            start = rangeEnd + 1;
          } else {
            start = end;
          }
        } else {
          const errorData = await uploadResponse.text();
          throw new Error(`Video upload failed: ${uploadResponse.status} - ${errorData}`);
        }
      }

      toast({
        title: "Video Uploaded!",
        description: `Successfully uploaded "${title}" to YouTube`,
      });

      return { 
        success: true, 
        videoId: result.id, 
        message: 'Video uploaded successfully',
        videoUrl: `https://www.youtube.com/watch?v=${result.id}`
      };

    } catch (error) {
      console.error('YouTube upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video to YouTube",
        variant: "destructive",
      });
      throw error;
    }
  }, [isConnected, userInfo, toast]);

  return {
    connect,
    disconnect,
    uploadVideo,
    isConnecting,
    isConnected,
    userInfo
  };
} 
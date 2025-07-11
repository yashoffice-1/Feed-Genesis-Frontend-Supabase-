import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InstagramAuthConfig {
  clientId: string;
  redirectUri: string;
}

export function useInstagramAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username: string; id: string } | null>(null);
  const { toast } = useToast();

  // Your Instagram app configuration
  const config: InstagramAuthConfig = {
    clientId: '1445579853240502', // Your Instagram Client ID
    redirectUri: window.location.origin + '/instagram-callback'
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Generate Instagram OAuth URL
      const authUrl = new URL('https://api.instagram.com/oauth/authorize');
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('scope', 'user_profile,user_media');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', Math.random().toString(36).substring(7));

      // Debug: Log the OAuth URL
      console.log('Generated OAuth URL:', authUrl.toString());
      console.log('Redirect URI:', config.redirectUri);

      // Open popup window
      const popup = window.open(
        authUrl.toString(),
        'instagram-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup messages
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
          setIsConnected(true);
          setUserInfo(event.data.user);
          popup?.close();
          
          toast({
            title: "Instagram Connected!",
            description: `Successfully connected to @${event.data.user.username}`,
          });

          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
          popup?.close();
          toast({
            title: "Connection Failed",
            description: event.data.error || "Failed to connect Instagram account",
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
        description: "Failed to open Instagram authentication",
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
      
      // Clear from database if needed
      await supabase
        .from('user_social_connections')
        .delete()
        .eq('platform', 'instagram');

      toast({
        title: "Instagram Disconnected",
        description: "Successfully disconnected from Instagram",
      });
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Instagram account",
        variant: "destructive",
      });
    }
  }, [toast]);

  const postToInstagram = useCallback(async (imageUrl: string, caption: string) => {
    if (!isConnected || !userInfo) {
      throw new Error('Instagram not connected');
    }

    // For now, this will show instructions to user
    toast({
      title: "Instagram Posting",
      description: "Instagram posting will be available once the backend is deployed. For now, please post manually.",
    });

    return { success: true, message: 'Manual posting required' };
  }, [isConnected, userInfo, toast]);

  return {
    connect,
    disconnect,
    postToInstagram,
    isConnecting,
    isConnected,
    userInfo
  };
} 
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Youtube } from 'lucide-react';

export function DirectYouTubeConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connectDirectly = async () => {
    setIsConnecting(true);
    
    try {
      // Generate YouTube OAuth URL
      const clientId = '912066635865-6rucscatfu2otov3s6clfnoh9hhuj9jh.apps.googleusercontent.com';
      const redirectUri = `${window.location.origin}/youtube-callback`;
      const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', 'direct-connect-' + Date.now());

      // Store current page in localStorage to return after auth
      localStorage.setItem('youtube_auth_return_url', window.location.pathname);
      
      // Navigate directly to YouTube OAuth (avoids popup CORS issues)
      window.location.href = authUrl.toString();
      
    } catch (error) {
      console.error('YouTube connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate YouTube connection",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={connectDirectly}
      disabled={isConnecting}
      className="flex items-center space-x-2"
      variant="outline"
    >
      <Youtube className="h-4 w-4" />
      <span>{isConnecting ? 'Connecting...' : 'Connect YouTube (Direct)'}</span>
    </Button>
  );
} 
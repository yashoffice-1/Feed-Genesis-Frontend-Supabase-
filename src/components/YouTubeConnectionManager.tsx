import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Youtube, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { DirectYouTubeConnect } from '@/components/DirectYouTubeConnect';
import { useYouTubeAuth } from '@/hooks/useYouTubeAuth';

interface YouTubeConnection {
  id: string;
  platform_display_name: string;
  platform_user_id: string;
  connected_at: string;
  token_expires_at: string;
  is_active: boolean;
}

export function YouTubeConnectionManager() {
  const [connection, setConnection] = useState<YouTubeConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();
  const { connect, isConnecting, isConnected, userInfo } = useYouTubeAuth();

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('platform', 'youtube')
        .eq('user_id', 'default_user')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking YouTube connection:', error);
        return;
      }

      if (data) {
        setConnection(data);
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!connection) return;
    
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('user_social_connections')
        .update({ is_active: false })
        .eq('id', connection.id);

      if (error) throw error;

      setConnection(null);
      toast({
        title: "YouTube Disconnected",
        description: "Successfully disconnected from YouTube",
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from YouTube",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check for URL parameters (from direct auth flow)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('youtube_success')) {
      toast({
        title: "YouTube Connected!",
        description: "Successfully connected your YouTube account",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh connection status
      setTimeout(checkConnection, 1000);
    } else if (urlParams.get('youtube_error')) {
      toast({
        title: "Connection Failed",
        description: urlParams.get('youtube_error') || "Failed to connect YouTube",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Checking YouTube connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Youtube className="h-5 w-5 text-red-600" />
          <span>YouTube Integration</span>
          {connection && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your YouTube account to automatically upload generated videos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Connected to YouTube</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Channel:</strong> {connection.platform_display_name}</p>
                <p><strong>Connected:</strong> {new Date(connection.connected_at).toLocaleDateString()}</p>
                <p><strong>Token expires:</strong> {new Date(connection.token_expires_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <Button
              onClick={disconnect}
              disabled={disconnecting}
              variant="outline"
              className="w-full"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect YouTube'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">YouTube Not Connected</span>
              </div>
              <p className="text-sm text-gray-600">
                Connect your YouTube account to enable automatic video uploads when generating content.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">Choose connection method:</div>
              
              {/* Popup Method */}
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Youtube className="h-4 w-4" />
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting (Popup)...</span>
                  </>
                ) : (
                  <span>Connect YouTube (Popup Method)</span>
                )}
              </Button>

              {/* Direct Method */}
              <DirectYouTubeConnect />

              <div className="text-xs text-gray-500 mt-2">
                💡 If popup method fails due to browser restrictions, try the direct method.
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <strong>Next steps after connecting:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Generate videos in Enhanced Product Generator</li>
            <li>Videos will automatically upload to your YouTube channel</li>
            <li>Configure video titles, descriptions, and privacy settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 
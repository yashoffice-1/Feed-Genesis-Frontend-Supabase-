import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function InstagramCallback() {
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          // Send error to parent window
          window.opener?.postMessage({
            type: 'INSTAGRAM_AUTH_ERROR',
            error: errorDescription || error
          }, window.location.origin);
          window.close();
          return;
        }

        if (code) {
          // Exchange code for access token
          const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: '1445579853240502', // Your Instagram Client ID
              client_secret: 'YOUR_INSTAGRAM_CLIENT_SECRET', // You'll need to provide this
              grant_type: 'authorization_code',
              redirect_uri: window.location.origin + '/instagram-callback',
              code: code
            })
          });

          if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
          }

          const tokenData = await tokenResponse.json();

          // Get user profile
          const profileResponse = await fetch(
            `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
          );

          if (!profileResponse.ok) {
            throw new Error('Failed to get user profile');
          }

          const profileData = await profileResponse.json();

          // Send success to parent window
          window.opener?.postMessage({
            type: 'INSTAGRAM_AUTH_SUCCESS',
            user: {
              id: profileData.id,
              username: profileData.username
            },
            token: tokenData.access_token
          }, window.location.origin);

          window.close();
        }
      } catch (error) {
        console.error('Instagram callback error:', error);
        window.opener?.postMessage({
          type: 'INSTAGRAM_AUTH_ERROR',
          error: error.message || 'Authentication failed'
        }, window.location.origin);
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing Instagram authentication...</p>
      </div>
    </div>
  );
} 
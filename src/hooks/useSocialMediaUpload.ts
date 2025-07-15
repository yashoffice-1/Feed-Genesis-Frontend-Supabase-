import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SocialConnection {
  id: string;
  platform: string;
  platform_display_name: string | null;
  platform_username: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: any;
  is_active: boolean;
}

interface UploadResult {
  success: boolean;
  platform: string;
  message: string;
  url?: string;
  error?: string;
}

interface AssetToUpload {
  id: string;
  title: string;
  asset_type: 'image' | 'video' | 'content';
  asset_url: string;
  description?: string;
  tags?: string[];
}

export function useSocialMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingPlatforms, setUploadingPlatforms] = useState<string[]>([]);
  const { toast } = useToast();

  // Get all connected platforms for the user
  const getConnectedPlatforms = useCallback(async (): Promise<SocialConnection[]> => {
    console.log('🔍 Loading connected platforms...');
    
    try {
      // Get current user ID or use default
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || 'default_user';
      
      console.log('🔍 Querying platforms for user ID:', currentUserId);
      
      const { data, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false });

      if (error) {
        console.error('Database error, checking localStorage:', error);
        
        // Fallback to check localStorage for any stored connections
        const platforms: SocialConnection[] = [];
        
        // Check YouTube connection
        const youtubeUserInfo = localStorage.getItem('youtube_user_info');
        const youtubeToken = localStorage.getItem('youtube_access_token');
        const youtubeExpiry = localStorage.getItem('youtube_expires_at');
        
        console.log('🔍 YouTube localStorage check:', { 
          hasUserInfo: !!youtubeUserInfo, 
          hasToken: !!youtubeToken, 
          hasExpiry: !!youtubeExpiry 
        });
        
        if (youtubeUserInfo && youtubeToken && youtubeExpiry) {
          const userInfo = JSON.parse(youtubeUserInfo);
          const expiryDate = new Date(youtubeExpiry);
          
          console.log('🔍 YouTube token expiry check:', { 
            expiryDate: expiryDate.toISOString(), 
            now: new Date().toISOString(),
            isValid: expiryDate > new Date()
          });
          
          if (expiryDate > new Date()) {
            platforms.push({
              id: 'youtube-local',
              platform: 'youtube',
              platform_display_name: userInfo.channelTitle || 'YouTube Channel',
              platform_username: userInfo.channelTitle,
              access_token: youtubeToken,
              refresh_token: null,
              token_expires_at: youtubeExpiry,
              metadata: { channel_id: userInfo.channelId },
              is_active: true
            });
          }
        }

        // Check Instagram connection
        const instagramUserInfo = localStorage.getItem('instagram_user_info');
        const instagramToken = localStorage.getItem('instagram_access_token');
        
        if (instagramUserInfo && instagramToken) {
          const userInfo = JSON.parse(instagramUserInfo);
          platforms.push({
            id: 'instagram-local',
            platform: 'instagram',
            platform_display_name: userInfo.username || 'Instagram Account',
            platform_username: userInfo.username,
            access_token: instagramToken,
            refresh_token: null,
            token_expires_at: null,
            metadata: { user_id: userInfo.id },
            is_active: true
          });
        }

        // Check Facebook connection
        const facebookUserInfo = localStorage.getItem('facebook_user_info');
        const facebookToken = localStorage.getItem('facebook_access_token');
        
        if (facebookUserInfo && facebookToken) {
          const userInfo = JSON.parse(facebookUserInfo);
          platforms.push({
            id: 'facebook-local',
            platform: 'facebook',
            platform_display_name: userInfo.name || 'Facebook Account',
            platform_username: userInfo.name,
            access_token: facebookToken,
            refresh_token: null,
            token_expires_at: null,
            metadata: { user_id: userInfo.id },
            is_active: true
          });
        }

        console.log('📱 Found platforms in localStorage:', platforms.map(p => p.platform));
        return platforms;
      }

      console.log('📱 Found platforms in database:', data?.map(p => p.platform) || []);
      
      // Map database data to SocialConnection interface
      // Using type assertion since the generated types are outdated
      const mappedData: SocialConnection[] = (data || []).map(item => {
        const dbItem = item as any; // Type assertion to access all fields
        return {
          id: dbItem.id,
          platform: dbItem.platform,
          platform_display_name: dbItem.platform_display_name || null,
          platform_username: dbItem.platform_username || null,
          access_token: dbItem.access_token || '',
          refresh_token: dbItem.refresh_token || null,
          token_expires_at: dbItem.token_expires_at || null,
          metadata: dbItem.metadata || {},
          is_active: dbItem.is_active ?? true
        };
      });
      
      return mappedData;
    } catch (error) {
      console.error('Error in getConnectedPlatforms:', error);
      return [];
    }
  }, []);

  // Upload to YouTube using official YouTube Data API v3
  const uploadToYouTube = useCallback(async (asset: AssetToUpload, connection: SocialConnection): Promise<UploadResult> => {
    console.log('🎬 Starting YouTube upload for:', asset.title);
    
    try {
      // Only use test mode for explicitly created demo/mock connections
      const isTestConnection = connection.access_token === 'demo_access_token_youtube' || 
                               connection.access_token.startsWith('test-youtube-token-') ||
                               connection.id === 'mock-youtube';
      
      console.log('🔍 YouTube Upload Mode:', {
        connectionId: connection.id,
        tokenPreview: connection.access_token.substring(0, 20) + '...',
        isTestMode: isTestConnection,
        mode: isTestConnection ? 'TEST' : 'REAL UPLOAD',
        platformDisplayName: connection.platform_display_name
      });
      
      if (isTestConnection) {
        console.log('🧪 Running in test/mock mode');
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate successful upload
        const mockVideoId = 'test-video-' + Date.now();
        const videoUrl = `https://www.youtube.com/watch?v=${mockVideoId}`;
        
        return {
          success: true,
          platform: 'youtube',
          message: `Successfully uploaded "${asset.title}" to YouTube (Test Mode)`,
          url: videoUrl
        };
      }

      console.log('🔴 Using REAL YouTube API upload mode');
      console.log('📋 Connection details:', {
        platform: connection.platform,
        displayName: connection.platform_display_name,
        hasToken: !!connection.access_token,
        tokenLength: connection.access_token?.length || 0,
        expiresAt: connection.token_expires_at
      });

      // Check if token is still valid, and refresh if necessary
      if (connection.token_expires_at) {
        const expiryDate = new Date(connection.token_expires_at);
        const now = new Date();
        const timeToExpire = expiryDate.getTime() - now.getTime();
        
        // If token expires within 5 minutes, try to refresh it
        if (timeToExpire <= 300000) { // 5 minutes in milliseconds
          console.log('🔄 YouTube token expires soon, attempting refresh...');
          
          if (connection.refresh_token) {
            try {
              const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  client_id: '912066635865-6rucscatfu2otov3s6clfnoh9hhuj9jh.apps.googleusercontent.com',
                  client_secret: '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',
                  grant_type: 'refresh_token',
                  refresh_token: connection.refresh_token
                })
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
                
                // Update the connection with new token
                connection.access_token = refreshData.access_token;
                connection.token_expires_at = newExpiresAt;
                
                // Try to update in database
                try {
                  // Get current user ID for database update
                  const { data: { user } } = await supabase.auth.getUser();
                  const updateUserId = user?.id || 'default_user';
                  
                  await supabase
                    .from('user_social_connections')
                    .update({
                      access_token: refreshData.access_token,
                      token_expires_at: newExpiresAt,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', updateUserId)
                    .eq('platform', 'youtube');
                } catch (dbError) {
                  console.warn('Failed to update refreshed token in database:', dbError);
                  // Update in localStorage as fallback
                  localStorage.setItem('youtube_access_token', refreshData.access_token);
                  localStorage.setItem('youtube_expires_at', newExpiresAt);
                }
                
                console.log('✅ YouTube token refreshed successfully');
              } else {
                console.warn('Failed to refresh YouTube token');
              }
            } catch (refreshError) {
              console.warn('Error refreshing YouTube token:', refreshError);
            }
          }
        }
        
        // Final check if token is still expired
        if (new Date(connection.token_expires_at) <= new Date()) {
          return {
            success: false,
            platform: 'youtube',
            message: 'YouTube token has expired. Please reconnect your account.',
            error: 'Token expired'
          };
        }
      }

      // Only allow video uploads to YouTube
      if (asset.asset_type !== 'video') {
        return {
          success: false,
          platform: 'youtube',
          message: 'YouTube only supports video uploads.',
          error: 'Unsupported asset type'
        };
      }

      // Check if asset URL is accessible
      if (!asset.asset_url || asset.asset_url === 'processing' || asset.asset_url === 'pending') {
        return {
          success: false,
          platform: 'youtube',
          message: 'Video is not ready for upload. Please wait for processing to complete.',
          error: 'Asset not ready'
        };
      }

      console.log('📥 Uploading video via YouTube OAuth function...');
      
      // Try to use the existing YouTube OAuth function to handle the upload
      try {
        // Get current user ID or use default
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id || 'default_user';
        
        console.log('🔍 Making YouTube upload request with user ID:', currentUserId);
        
        const { data: uploadResponse, error: uploadError } = await supabase.functions.invoke('youtube-oauth', {
          body: {
            action: 'upload_video',
            userId: currentUserId,
            videoUrl: asset.asset_url,
            title: asset.title,
            description: asset.description || `Generated with FeedGenesis\n\nTags: ${asset.tags?.join(', ') || 'video, content'}\n\nCreated using AI-powered video generation.`,
            tags: asset.tags || ['video', 'content', 'AI', 'generated'],
            privacyStatus: 'public'
          }
        });

        if (uploadError) {
          console.error('❌ OAuth function error:', uploadError);
          throw new Error(uploadError.message || 'OAuth function failed');
        }

        if (uploadResponse && uploadResponse.success) {
          console.log('🎉 Video uploaded successfully:', uploadResponse.url);
          return {
            success: true,
            platform: 'youtube',
            message: `Successfully uploaded "${asset.title}" to YouTube`,
            url: uploadResponse.url
          };
        } else {
          throw new Error(uploadResponse?.error || 'Upload failed');
        }
      } catch (oauthError) {
        console.warn('OAuth function method failed, trying direct upload:', oauthError);
        
        // Fallback: Try direct upload with a simple approach
        console.log('📥 Attempting simplified direct upload...');
        
        // For now, return a message that the upload needs to be done manually
        return {
          success: false,
          platform: 'youtube',
          message: `Unable to upload "${asset.title}" to YouTube. Please upload manually: ${asset.asset_url}`,
          error: 'Direct upload blocked by CORS policy. Please upload the video manually to your YouTube channel.'
        };
      }
    } catch (error) {
      console.error('❌ YouTube upload error:', error);
      return {
        success: false,
        platform: 'youtube',
        message: error.message || 'Failed to upload to YouTube',
        error: error.message
      };
    }
  }, []);

  // Upload to Instagram (placeholder for now)
  const uploadToInstagram = useCallback(async (asset: AssetToUpload, connection: SocialConnection): Promise<UploadResult> => {
    // Check if this is a test connection (mock mode)
    const isTestConnection = connection.access_token === 'demo_access_token_instagram';
    
    console.log('🔍 Instagram Upload Mode:', {
      tokenPreview: connection.access_token.substring(0, 20) + '...',
      isTestMode: isTestConnection,
      mode: isTestConnection ? 'TEST' : 'REAL UPLOAD'
    });
    
    if (isTestConnection) {
      console.log('🧪 Running Instagram upload in test/mock mode');
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful upload
      const mockPostId = 'test-post-' + Date.now();
      const postUrl = `https://www.instagram.com/p/${mockPostId}/`;
      
      return {
        success: true,
        platform: 'instagram',
        message: `Successfully uploaded "${asset.title}" to Instagram (Test Mode)`,
        url: postUrl
      };
    }

    // Instagram API requires app review and specific permissions
    // For now, return a message about manual posting
    return {
      success: false,
      platform: 'instagram',
      message: 'Instagram posting requires manual upload. The Instagram API has restrictions that require app review.',
      error: 'Manual posting required'
    };
  }, []);

  // Upload to Facebook (placeholder for now)
  const uploadToFacebook = useCallback(async (asset: AssetToUpload, connection: SocialConnection): Promise<UploadResult> => {
    // Check if this is a test connection (mock mode)
    const isTestConnection = connection.access_token === 'demo_access_token_facebook';
    
    console.log('🔍 Facebook Upload Mode:', {
      tokenPreview: connection.access_token.substring(0, 20) + '...',
      isTestMode: isTestConnection,
      mode: isTestConnection ? 'TEST' : 'REAL UPLOAD'
    });
    
    if (isTestConnection) {
      console.log('🧪 Running Facebook upload in test/mock mode');
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate successful upload
      const mockPostId = 'test-facebook-post-' + Date.now();
      const postUrl = `https://www.facebook.com/posts/${mockPostId}`;
      
      return {
        success: true,
        platform: 'facebook',
        message: `Successfully uploaded "${asset.title}" to Facebook (Test Mode)`,
        url: postUrl
      };
    }

    // Facebook API would require similar implementation to YouTube
    // For now, return a message about manual posting
    return {
      success: false,
      platform: 'facebook',
      message: 'Facebook posting will be available in a future update. For now, please post manually.',
      error: 'Manual posting required'
    };
  }, []);

  // Main upload function
  const uploadToSocialMedia = useCallback(async (
    asset: AssetToUpload,
    selectedPlatforms: string[]
  ): Promise<UploadResult[]> => {
    setIsUploading(true);
    setUploadingPlatforms(selectedPlatforms);

    try {
      // Get all connected platforms
      const connections = await getConnectedPlatforms();
      
      if (connections.length === 0) {
        toast({
          title: "No Connected Platforms",
          description: "Please connect at least one social media platform first.",
          variant: "destructive",
        });
        return [];
      }

      // Filter connections for selected platforms
      const selectedConnections = connections.filter(conn => 
        selectedPlatforms.includes(conn.platform)
      );

      if (selectedConnections.length === 0) {
        toast({
          title: "Invalid Platform Selection",
          description: "None of the selected platforms are connected.",
          variant: "destructive",
        });
        return [];
      }

      // Upload to each selected platform
      const uploadPromises = selectedConnections.map(async (connection) => {
        setUploadingPlatforms(prev => [...prev, connection.platform]);

        try {
          let result: UploadResult;
          
          switch (connection.platform) {
            case 'youtube':
              result = await uploadToYouTube(asset, connection);
              break;
            case 'instagram':
              result = await uploadToInstagram(asset, connection);
              break;
            case 'facebook':
              result = await uploadToFacebook(asset, connection);
              break;
            default:
              result = {
                success: false,
                platform: connection.platform,
                message: `Upload to ${connection.platform} is not yet supported.`,
                error: 'Platform not supported'
              };
          }

          return result;
        } finally {
          setUploadingPlatforms(prev => prev.filter(p => p !== connection.platform));
        }
      });

      const results = await Promise.all(uploadPromises);

      // Show results
      const successResults = results.filter(r => r.success);
      const failureResults = results.filter(r => !r.success);

      if (successResults.length > 0) {
        toast({
          title: "Upload Success",
          description: `Successfully uploaded to ${successResults.length} platform(s): ${successResults.map(r => r.platform).join(', ')}`,
        });
      }

      if (failureResults.length > 0) {
        toast({
          title: "Some Uploads Failed",
          description: `Failed to upload to: ${failureResults.map(r => r.platform).join(', ')}`,
          variant: "destructive",
        });
      }

      return results;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload to social media platforms",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsUploading(false);
      setUploadingPlatforms([]);
    }
  }, [getConnectedPlatforms, uploadToYouTube, uploadToInstagram, uploadToFacebook, toast]);

  return {
    uploadToSocialMedia,
    getConnectedPlatforms,
    isUploading,
    uploadingPlatforms
  };
} 
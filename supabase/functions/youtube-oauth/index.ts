import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling CORS preflight request');
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { action, code, state, userId } = await req.json();
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('YOUTUBE_REDIRECT_URI') || `${supabaseUrl}/functions/v1/youtube-oauth`;

    if (!googleClientId || !googleClientSecret) {
      console.error('❌ Google OAuth credentials not configured');
      throw new Error('Google OAuth credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Determine user ID - use provided userId, or fallback to 'default_user' for backward compatibility
    const actualUserId = userId || state || 'default_user';
    console.log('🔍 Using user ID:', { provided: userId, state, actual: actualUserId });

    if (action === 'get_auth_url') {
      // Generate authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
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
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
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
      console.log('Token exchange successful');

      // Get channel information
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        }
      );

      if (!channelResponse.ok) {
        throw new Error('Failed to fetch channel information');
      }

      const channelData = await channelResponse.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error('No YouTube channel found for this account');
      }

      const channel = channelData.items[0];
      console.log('Channel data:', channel);

      // Calculate token expiration
      const expiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour default

      // Store in database
      const { data, error } = await supabase
        .from('user_social_connections')
        .upsert({
          user_id: actualUserId,
          platform: 'youtube',
          platform_user_id: channel.id,
          platform_username: channel.snippet.customUrl || channel.snippet.title,
          platform_display_name: channel.snippet.title,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
          metadata: JSON.stringify({
            channel_id: channel.id,
            channel_title: channel.snippet.title,
            channel_description: channel.snippet.description,
            thumbnail_url: channel.snippet.thumbnails?.default?.url
          }),
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
        message: 'YouTube connected successfully',
        user: {
          channelTitle: channel.snippet.title,
          channelId: channel.id
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'refresh_token') {
      const { refresh_token } = await req.json();

      if (!refresh_token) {
        throw new Error('Refresh token required');
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        })
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', errorText);
        throw new Error(`Token refresh failed: ${refreshResponse.status}`);
      }

      const refreshData = await refreshResponse.json();
      
      // Calculate new expiration
      const expiresAt = refreshData.expires_in 
        ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString();

      // Update in database
      const { data, error } = await supabase
        .from('user_social_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || refresh_token, // Use new refresh token if provided
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', actualUserId)
        .eq('platform', 'youtube');

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update token');
      }

      return new Response(JSON.stringify({
        success: true,
        access_token: refreshData.access_token,
        expires_at: expiresAt
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'disconnect') {
      const { data, error } = await supabase
        .from('user_social_connections')
        .delete()
        .eq('user_id', actualUserId)
        .eq('platform', 'youtube');

      if (error) {
        throw new Error('Failed to disconnect');
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'YouTube disconnected successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'check_connection') {
      const { data, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', actualUserId)
        .eq('platform', 'youtube')
        .single();

      return new Response(JSON.stringify({
        success: true,
        connected: !error && data,
        connection: data || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'upload_video') {
      const { userId, videoUrl, title, description, tags = [], privacyStatus = 'public' } = await req.json();

      console.log('🎬 YouTube upload_video action started:', { 
        userId, 
        videoUrl: videoUrl.substring(0, 50) + '...', 
        title,
        description: description?.substring(0, 100) + '...',
        tags: tags.length,
        privacyStatus 
      });

      if (!userId || !videoUrl || !title) {
        throw new Error('Missing required fields: userId, videoUrl, title');
      }

      // Get YouTube connection
      const { data: connection, error: connectionError } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'youtube')
        .eq('is_active', true)
        .single();

      if (connectionError || !connection) {
        console.error('❌ YouTube connection error:', connectionError);
        throw new Error('YouTube account not connected');
      }

      console.log('✅ YouTube connection found:', {
        displayName: connection.platform_display_name,
        hasToken: !!connection.access_token,
        tokenPreview: connection.access_token?.substring(0, 20) + '...',
        tokenLength: connection.access_token?.length || 0,
        expiresAt: connection.token_expires_at,
        hasRefreshToken: !!connection.refresh_token,
        scope: connection.scope,
        isActive: connection.is_active
      });

      // Validate token format (Google OAuth tokens typically start with 'ya29.' for access tokens)
      if (connection.access_token && !connection.access_token.startsWith('ya29.') && !connection.access_token.startsWith('1//')) {
        console.warn('⚠️ Unusual token format detected:', {
          tokenStart: connection.access_token.substring(0, 10),
          expectedFormat: 'ya29.* or 1//*'
        });
      }

      // Check if token is expired and refresh if needed
      let accessToken = connection.access_token;
      if (connection.token_expires_at) {
        const expiryDate = new Date(connection.token_expires_at);
        const timeToExpire = expiryDate.getTime() - Date.now();
        
        console.log('🕐 Token expiry check:', {
          expiresAt: expiryDate.toISOString(),
          timeToExpire: Math.round(timeToExpire / 60000) + ' minutes',
          needsRefresh: timeToExpire <= 300000
        });
        
        if (timeToExpire <= 300000) { // 5 minutes
          console.log('🔄 Token expires soon, refreshing...');
          
          if (connection.refresh_token) {
            try {
              const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  client_id: googleClientId,
                  client_secret: googleClientSecret,
                  grant_type: 'refresh_token',
                  refresh_token: connection.refresh_token
                })
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                accessToken = refreshData.access_token;
                
                console.log('✅ Token refreshed successfully:', {
                  newTokenPreview: accessToken.substring(0, 20) + '...',
                  newTokenLength: accessToken.length,
                  expiresIn: refreshData.expires_in,
                  newExpiryTime: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
                });
                
                // Update token in database
                const { error: updateError } = await supabase
                  .from('user_social_connections')
                  .update({
                    access_token: accessToken,
                    token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', connection.id);
                  
                if (updateError) {
                  console.warn('⚠️ Failed to update refreshed token in database:', updateError);
                } else {
                  console.log('✅ Database updated with new token');
                }
              } else {
                const errorText = await refreshResponse.text();
                console.error('❌ Token refresh failed:', {
                  status: refreshResponse.status,
                  statusText: refreshResponse.statusText,
                  error: errorText,
                  refreshTokenPreview: connection.refresh_token?.substring(0, 20) + '...'
                });
                throw new Error(`Failed to refresh access token: ${refreshResponse.status} - ${errorText}`);
              }
            } catch (refreshError) {
              console.error('❌ Token refresh error:', refreshError);
              throw new Error('Failed to refresh access token: ' + refreshError.message);
            }
          } else {
            throw new Error('No refresh token available - please reconnect your YouTube account');
          }
        }
      }

      console.log('📥 Fetching video file from:', videoUrl);
      
      // Download the video file
      try {
        const videoResponse = await fetch(videoUrl);
        console.log('📡 Video fetch response:', {
          status: videoResponse.status,
          statusText: videoResponse.statusText,
          contentType: videoResponse.headers.get('content-type'),
          contentLength: videoResponse.headers.get('content-length')
        });
        
        if (!videoResponse.ok) {
          console.error('❌ Video fetch failed:', {
            status: videoResponse.status,
            statusText: videoResponse.statusText,
            headers: Object.fromEntries(videoResponse.headers.entries())
          });
          throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
        }

        const videoBlob = await videoResponse.blob();
        const videoSize = videoBlob.size;
        
        console.log('✅ Video downloaded successfully:', {
          size: `${Math.round(videoSize / 1024 / 1024 * 100) / 100} MB`,
          type: videoBlob.type,
          sizeBytes: videoSize
        });

        // Validate video file
        if (videoSize === 0) {
          throw new Error('Downloaded video file is empty (0 bytes)');
        }
        
        if (videoSize > 128 * 1024 * 1024) { // 128MB limit for YouTube
          throw new Error(`Video file too large: ${Math.round(videoSize / 1024 / 1024)} MB (max 128MB)`);
        }
        
        const validMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        if (!validMimeTypes.some(type => videoBlob.type.includes(type.split('/')[1]))) {
          console.warn('⚠️ Unusual video MIME type:', videoBlob.type, 'proceeding anyway...');
        }

        // Log file details for debugging
        console.log('📹 Video file ready for upload:', {
          size: videoSize,
          type: videoBlob.type,
          isBlob: videoBlob instanceof Blob,
          canReadAsArrayBuffer: true
        });

        // Create metadata for YouTube upload
        const metadata = {
          snippet: {
            title: title.substring(0, 100),
            description: description || `Generated with FeedGenesis\n\nCreated using AI-powered video generation.`,
            tags: tags.slice(0, 500),
            categoryId: '22',
            defaultLanguage: 'en'
          },
          status: {
            privacyStatus: privacyStatus,
            selfDeclaredMadeForKids: false
          }
        };

        console.log('📋 Upload metadata:', metadata);

        // Initialize resumable upload
        console.log('🚀 Initializing YouTube resumable upload...');
        
        // Determine correct MIME type for upload
        const uploadMimeType = videoBlob.type || 'video/mp4';
        
        const uploadHeaders = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': videoSize.toString(),
          'X-Upload-Content-Type': uploadMimeType
        };
        
        console.log('📋 Upload headers (token masked):', {
          ...uploadHeaders,
          'Authorization': `Bearer ${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`
        });
        
        const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
          method: 'POST',
          headers: uploadHeaders,
          body: JSON.stringify(metadata)
        });

        console.log('📡 Upload init response:', {
          status: initResponse.status,
          statusText: initResponse.statusText,
          hasLocation: !!initResponse.headers.get('Location'),
          location: initResponse.headers.get('Location')?.substring(0, 100) + '...'
        });

        if (!initResponse.ok) {
          const errorText = await initResponse.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          console.error('❌ Upload initialization failed:', {
            status: initResponse.status,
            statusText: initResponse.statusText,
            error: errorText,
            parsedError: errorDetails,
            requestHeaders: Object.keys(uploadHeaders),
            videoSize: videoSize,
            videoType: uploadMimeType
          });
          
          // Provide specific error messages for common issues
          let errorMessage = `Upload initialization failed: ${initResponse.status} ${initResponse.statusText}`;
          if (initResponse.status === 400) {
            errorMessage += ' - This is usually due to invalid OAuth token, incorrect video metadata, or missing YouTube upload permissions.';
          } else if (initResponse.status === 401) {
            errorMessage += ' - OAuth token is invalid or expired. Please reconnect your YouTube account.';
          } else if (initResponse.status === 403) {
            errorMessage += ' - Insufficient permissions. Make sure your YouTube account has upload permissions.';
          }
          
          throw new Error(errorMessage);
        }

        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('No upload URL received from YouTube');
        }

        console.log('✅ Upload URL received, starting chunked upload...');

        // Upload video file in chunks
        const chunkSize = 1024 * 1024 * 5; // 5MB chunks
        const videoArray = new Uint8Array(await videoBlob.arrayBuffer());
        let start = 0;
        let result: any = null;

        while (start < videoArray.length) {
          const end = Math.min(start + chunkSize, videoArray.length);
          const chunk = videoArray.slice(start, end);
          const progress = Math.round((end / videoArray.length) * 100);
          
          console.log(`📤 Uploading chunk: ${start}-${end-1}/${videoArray.length} (${progress}%)`);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': chunk.length.toString(),
              'Content-Range': `bytes ${start}-${end - 1}/${videoArray.length}`
            },
            body: chunk
          });

          console.log(`📡 Chunk response: ${uploadResponse.status} ${uploadResponse.statusText}`);

          if (uploadResponse.status === 200 || uploadResponse.status === 201) {
            result = await uploadResponse.json();
            console.log('✅ Upload completed successfully!');
            break;
          } else if (uploadResponse.status === 308) {
            // Continue uploading
            const range = uploadResponse.headers.get('Range');
            if (range) {
              const rangeEnd = parseInt(range.split('-')[1]);
              start = rangeEnd + 1;
            } else {
              start = end;
            }
            console.log(`⏭️ Continuing from byte ${start}`);
          } else {
            const errorText = await uploadResponse.text();
            console.error('❌ Chunk upload failed:', {
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
              error: errorText
            });
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }
        }

        if (!result || !result.id) {
          console.error('❌ Upload completion issue:', {
            hasResult: !!result,
            resultKeys: result ? Object.keys(result) : [],
            resultPreview: result ? JSON.stringify(result).substring(0, 500) : 'null'
          });
          throw new Error('Upload completed but no video ID received');
        }

        const youtubeUrl = `https://www.youtube.com/watch?v=${result.id}`;
        console.log('🎉 YouTube upload successful:', {
          videoId: result.id,
          url: youtubeUrl,
          title: result.snippet?.title,
          uploadedBy: connection.platform_display_name,
          channelId: connection.metadata?.channel_id || 'unknown',
          publishedAt: result.snippet?.publishedAt || 'pending',
          privacyStatus: result.status?.privacyStatus || privacyStatus
        });

        return new Response(JSON.stringify({
          success: true,
          videoId: result.id,
          url: youtubeUrl,
          title: result.snippet?.title || title,
          message: 'Video uploaded successfully to YouTube'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (fetchError) {
        console.error('❌ Video fetch/upload error:', fetchError);
        throw new Error(`Video processing failed: ${fetchError.message}`);
      }
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('❌ YouTube OAuth error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return proper error response with 200 status but success: false
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 200, // Use 200 to avoid CORS issues, but indicate error in response body
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 
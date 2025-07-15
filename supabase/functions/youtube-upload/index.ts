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

  try {
    const { 
      userId, 
      videoUrl, 
      title, 
      description, 
      tags = [],
      privacyStatus = 'public'
    } = await req.json();

    if (!userId || !videoUrl || !title) {
      throw new Error('Missing required fields: userId, videoUrl, title');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get YouTube connection details
    const { data: connection, error: connectionError } = await supabase
      .from('user_social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single();

    if (connectionError || !connection) {
      throw new Error('YouTube account not connected');
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    if (connection.token_expires_at) {
      const expiryDate = new Date(connection.token_expires_at);
      const now = new Date();
      const timeToExpire = expiryDate.getTime() - now.getTime();
      
      // If token expires within 5 minutes, refresh it
      if (timeToExpire <= 300000) {
        console.log('Token expires soon, refreshing...');
        
        if (connection.refresh_token) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
              grant_type: 'refresh_token',
              refresh_token: connection.refresh_token
            })
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
            
            // Update token in database
            await supabase
              .from('user_social_connections')
              .update({
                access_token: accessToken,
                token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', connection.id);
          }
        }
      }
    }

    console.log('Fetching video file from:', videoUrl);
    
    // Download the video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoSize = videoBlob.size;
    
    console.log('Video file size:', videoSize, 'bytes');

    // Create metadata for YouTube upload
    const metadata = {
      snippet: {
        title: title.substring(0, 100), // YouTube title limit
        description: description || `Generated with FeedGenesis\n\nTags: ${tags.join(', ')}\n\nCreated using AI-powered video generation.`,
        tags: tags.slice(0, 500), // YouTube tag limit
        categoryId: '22', // People & Blogs
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en'
      },
      status: {
        privacyStatus: privacyStatus,
        selfDeclaredMadeForKids: false,
        embeddable: true,
        license: 'youtube',
        publicStatsViewable: true
      }
    };

    console.log('Initializing YouTube upload...');

    // Step 1: Initialize resumable upload
    const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Length': videoSize.toString(),
        'X-Upload-Content-Type': 'video/mp4'
      },
      body: JSON.stringify(metadata)
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error('Upload initialization failed:', errorText);
      throw new Error(`Upload initialization failed: ${initResponse.status} ${initResponse.statusText}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    console.log('Upload URL received, uploading video...');

    // Step 2: Upload video file in chunks
    const chunkSize = 1024 * 1024 * 5; // 5MB chunks
    const videoArray = new Uint8Array(await videoBlob.arrayBuffer());
    let start = 0;
    let uploadComplete = false;
    let result: any = null;

    while (!uploadComplete) {
      const end = Math.min(start + chunkSize, videoArray.length);
      const chunk = videoArray.slice(start, end);
      
      console.log(`Uploading chunk: ${start}-${end-1}/${videoArray.length} (${Math.round((end/videoArray.length)*100)}%)`);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${start}-${end - 1}/${videoArray.length}`
        },
        body: chunk
      });

      if (uploadResponse.status === 200 || uploadResponse.status === 201) {
        // Upload complete
        result = await uploadResponse.json();
        uploadComplete = true;
        console.log('Upload completed successfully');
      } else if (uploadResponse.status === 308) {
        // Continue uploading
        const range = uploadResponse.headers.get('Range');
        if (range) {
          const rangeEnd = parseInt(range.split('-')[1]);
          start = rangeEnd + 1;
        } else {
          start = end;
        }
      } else {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
    }

    if (!result || !result.id) {
      throw new Error('Upload completed but no video ID received');
    }

    const videoId = result.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log('YouTube upload successful:', youtubeUrl);

    return new Response(JSON.stringify({
      success: true,
      videoId: videoId,
      url: youtubeUrl,
      title: result.snippet?.title || title,
      message: 'Video uploaded successfully to YouTube'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('YouTube upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Upload failed'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 
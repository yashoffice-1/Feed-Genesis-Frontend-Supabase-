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
      imageUrl, 
      caption, 
      isCarousel = false,
      carouselUrls = []
    } = await req.json();

    if (!userId || !imageUrl || !caption) {
      throw new Error('Missing required fields: userId, imageUrl, caption');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Instagram connection details
    const { data: connection, error: connectionError } = await supabase
      .from('user_social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'instagram')
      .single();

    if (connectionError || !connection) {
      throw new Error('Instagram account not connected');
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      throw new Error('Instagram access token has expired. Please reconnect your account.');
    }

    const accessToken = connection.access_token;
    const instagramUserId = connection.platform_user_id;

    console.log('Posting to Instagram for user:', instagramUserId);

    if (isCarousel && carouselUrls.length > 1) {
      // Handle carousel post (multiple images)
      const containerIds = [];

      // Upload each image and get container IDs
      for (const url of carouselUrls) {
        const containerResponse = await fetch(
          `https://graph.facebook.com/v18.0/${instagramUserId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: accessToken
            })
          }
        );

        if (!containerResponse.ok) {
          const errorText = await containerResponse.text();
          console.error('Failed to create carousel item:', errorText);
          throw new Error(`Failed to upload carousel item: ${containerResponse.status}`);
        }

        const containerData = await containerResponse.json();
        containerIds.push(containerData.id);
      }

      // Create carousel container
      const carouselResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: containerIds,
            caption: caption,
            access_token: accessToken
          })
        }
      );

      if (!carouselResponse.ok) {
        const errorText = await carouselResponse.text();
        console.error('Failed to create carousel container:', errorText);
        throw new Error(`Failed to create carousel: ${carouselResponse.status}`);
      }

      const carouselData = await carouselResponse.json();

      // Publish the carousel
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: carouselData.id,
            access_token: accessToken
          })
        }
      );

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('Failed to publish carousel:', errorText);
        throw new Error(`Failed to publish carousel: ${publishResponse.status}`);
      }

      const publishData = await publishResponse.json();

      return new Response(JSON.stringify({
        success: true,
        message: 'Carousel post published successfully',
        post_id: publishData.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      // Handle single image post
      console.log('Creating single image post with URL:', imageUrl);

      // First, create a container for the image
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken
          })
        }
      );

      if (!containerResponse.ok) {
        const errorText = await containerResponse.text();
        console.error('Container creation failed:', errorText);
        throw new Error(`Failed to create media container: ${containerResponse.status} - ${errorText}`);
      }

      const containerData = await containerResponse.json();
      console.log('Container created successfully:', containerData.id);

      // Wait a moment for the image to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Publish the post
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${instagramUserId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: accessToken
          })
        }
      );

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('Publishing failed:', errorText);
        throw new Error(`Failed to publish post: ${publishResponse.status} - ${errorText}`);
      }

      const publishData = await publishResponse.json();
      console.log('Post published successfully:', publishData.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Post published successfully to Instagram',
        post_id: publishData.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Instagram posting error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 
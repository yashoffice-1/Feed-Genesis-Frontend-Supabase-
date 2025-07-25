
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenAIRequest {
  type: 'clean-instruction' | 'marketing-content' | 'marketing-suggestions';
  instruction?: string;
  productInfo?: {
    name: string;
    description: string;
    category?: string | null;
    brand?: string | null;
  };
  context?: {
    channel?: string;
    assetType?: string;
    format?: string;
    specification?: string;
  };
  channel?: string;
  assetType?: string;
  format?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, instruction, productInfo, context, channel, assetType, format }: OpenAIRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'clean-instruction') {
      systemPrompt = `You are an expert marketing content specialist. Your job is to take user instructions and optimize them for AI content generation. Make the instructions clear, specific, and marketing-focused while preserving the user's original intent.

Guidelines:
- Keep the core message but make it more specific
- Add marketing angle and target audience consideration
- Ensure it's actionable for content generation
- Make it professional but engaging
- Keep it concise (under 200 words)
- Consider the channel, asset type, and format context provided`;

      const contextInfo = context ? `
Context: Creating ${context.assetType} content for ${context.channel} in ${context.format} format (${context.specification})` : '';

      userPrompt = `Please optimize this instruction for marketing content generation: "${instruction}"

${productInfo ? `Product context: ${productInfo.name}${productInfo.brand ? ` by ${productInfo.brand}` : ''}${productInfo.category ? ` in ${productInfo.category}` : ''}${productInfo.description ? ` - ${productInfo.description}` : ''}` : ''}${contextInfo}

Return only the optimized instruction, no explanation.`;

    } else if (type === 'marketing-suggestions') {
      systemPrompt = `You are a creative marketing strategist specializing in generating smart, actionable content ideas based on products, channels, and marketing trends. Generate 4-6 specific, creative instruction suggestions that would work well for the given context.

Focus on:
- Channel-specific best practices
- Seasonal marketing opportunities  
- Target audience engagement
- Product positioning strategies
- Current marketing trends
- Conversion-focused approaches`;

      userPrompt = `Generate creative marketing instruction suggestions for:

Product: ${productInfo?.name || 'Product'}
${productInfo?.brand ? `Brand: ${productInfo.brand}` : ''}
${productInfo?.category ? `Category: ${productInfo.category}` : ''}
${productInfo?.description ? `Description: ${productInfo.description}` : ''}

Channel: ${channel || 'social media'}
Asset Type: ${assetType || 'content'}
Format: ${format || 'post'}

Return 4-6 specific, creative instruction suggestions (one per line). Each should be actionable and tailored to the channel and product. Focus on different angles like benefits, lifestyle, social proof, urgency, education, etc.`;

    } else if (type === 'marketing-content') {
      // Detect the channel/platform from the instruction
      let platformContext = '';
      const instructionLower = instruction?.toLowerCase() || '';
      
      if (instructionLower.includes('facebook') || instructionLower.includes('fb ad')) {
        platformContext = 'Facebook advertising platform with engaging headline, benefit-focused copy, and strong CTA';
      } else if (instructionLower.includes('instagram story')) {
        platformContext = 'Instagram Story format with short, punchy text and relevant hashtags';
      } else if (instructionLower.includes('sms')) {
        platformContext = 'SMS marketing with concise message under 160 characters';
      } else if (instructionLower.includes('email')) {
        platformContext = 'Email marketing with subject line and structured body content';
      } else {
        platformContext = 'general marketing content with professional tone';
      }

      systemPrompt = `You are a professional marketing copywriter specializing in creating compelling content for different advertising channels and platforms. Create engaging marketing content that is properly formatted for the specified platform. Focus on benefits, emotional appeal, and clear calls to action.

Platform Context: ${platformContext}

Return clean, formatted text that can be used directly in marketing campaigns. Do NOT return JSON format.`;

      userPrompt = `Create marketing content based on this instruction: "${instruction}"

Product Details:
- Name: ${productInfo?.name || 'Product'}
${productInfo?.brand ? `- Brand: ${productInfo.brand}` : ''}
${productInfo?.category ? `- Category: ${productInfo.category}` : ''}
${productInfo?.description ? `- Description: ${productInfo.description}` : ''}

Please create properly formatted marketing content with:

1. HEADLINE: (compelling, attention-grabbing headline)
2. BODY TEXT: (persuasive copy highlighting benefits and features)
3. CALL TO ACTION: (clear, action-oriented CTA)
4. HASHTAGS: (3-5 relevant hashtags if appropriate for the platform)

Format your response as clean, readable text with clear sections. Use line breaks between sections for better readability.`;

    } else if (type === 'social_content') {
      const { selectedPlatforms, formatSpecs } = await req.json();
      
      systemPrompt = `You are a social media content specialist. Create platform-specific content that's optimized for each social media platform's unique characteristics, audience, and format requirements.

Platform-Specific Guidelines:
- Instagram: Visual storytelling, emojis, hashtags, authentic voice
- Facebook: Community-focused, conversational, longer captions okay
- Twitter/X: Concise, timely, trending topics, character limits
- LinkedIn: Professional tone, industry insights, thought leadership
- TikTok: Trendy, fun, youth-focused, video-first mindset
- YouTube: Descriptive, SEO-friendly, engaging thumbnails
- Pinterest: Inspirational, how-to focused, keyword-rich
- Google Ads: Search intent-focused, benefit-driven, action-oriented
- Email: Subject + body, personalized, conversion-focused
- SMS: Ultra-concise, immediate value, clear CTA

Return a JSON object with platform-specific content for each requested platform.`;

      const platforms = selectedPlatforms || ['instagram', 'facebook', 'twitter', 'linkedin'];
      const specs = formatSpecs || {};
      
      userPrompt = `Create platform-specific social media content for these platforms: ${platforms.join(', ')}

Product/Content Details:
- Name: ${productInfo?.name || 'Content'}
${productInfo?.brand ? `- Brand: ${productInfo.brand}` : ''}
${productInfo?.category ? `- Category: ${productInfo.category}` : ''}
${productInfo?.description ? `- Description: ${productInfo.description}` : ''}

Instruction: "${instruction}"

Format specifications: ${JSON.stringify(specs)}

For each platform, provide:
- caption: Platform-optimized main text
- hashtags: Relevant hashtags (formatted as single string)
- mentions: Suggested mentions if applicable

Return as JSON with this structure:
{
  "instagram": { "caption": "...", "hashtags": "...", "mentions": "..." },
  "facebook": { "caption": "...", "hashtags": "...", "mentions": "..." },
  // ... for each requested platform
}`;
    }

    console.log(`Sending to OpenAI - Type: ${type}, System: ${systemPrompt.substring(0, 100)}...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: type === 'marketing-suggestions' ? 0.8 : 0.7,
        max_tokens: type === 'marketing-suggestions' ? 600 : 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log(`OpenAI ${type} request completed successfully. Result length: ${result.length} characters`);

    return new Response(JSON.stringify({ 
      success: true, 
      result: result,
      type: type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in openai-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

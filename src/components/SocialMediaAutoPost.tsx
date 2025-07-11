import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube,
  CheckCircle,
  Loader2,
  AlertCircle,
  Edit
} from "lucide-react";

interface PlatformContent {
  caption: string;
  hashtags: string;
  mentions: string;
}

interface SocialMediaAutoPostProps {
  imageUrl: string;
  instruction: string;
  isVisible: boolean;
  selectedChannels?: string[];
  formatSpecs?: any;
}

interface PostingStatus {
  status: 'idle' | 'posting' | 'success' | 'error';
  message?: string;
}

export function SocialMediaAutoPost({ imageUrl, instruction, isVisible, selectedChannels = [], formatSpecs }: SocialMediaAutoPostProps) {
  const { toast } = useToast();
  const [platformContent, setPlatformContent] = useState<Record<string, PlatformContent>>({});
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>(['facebook']); // Mock data for non-Instagram platforms
  const [postingStatus, setPostingStatus] = useState<Record<string, PostingStatus>>({});
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);

  const platforms = {
    instagram: { name: "Instagram", icon: Instagram, color: "bg-pink-600" },
    facebook: { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    twitter: { name: "Twitter/X", icon: Twitter, color: "bg-black" },
    linkedin: { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
    youtube: { name: "YouTube", icon: Youtube, color: "bg-red-600" },
    pinterest: { name: "Pinterest", icon: () => (
      <div className="h-5 w-5 bg-red-600 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">P</span>
      </div>
    ), color: "bg-red-600" },
    tiktok: { name: "TikTok", icon: () => (
      <div className="h-5 w-5 bg-black rounded-sm flex items-center justify-center">
        <span className="text-xs font-bold text-white">T</span>
      </div>
    ), color: "bg-black" }
  };

  useEffect(() => {
    if (isVisible && imageUrl && instruction) {
      generatePlatformContent();
    }
  }, [isVisible, imageUrl, instruction]);

  useEffect(() => {
    if (isVisible) {
      checkConnectedPlatforms();
    }
  }, [isVisible]);

  const checkConnectedPlatforms = async () => {
    setIsCheckingConnections(true);
    try {
      // Check Instagram connection
      const { data, error } = await supabase.functions.invoke('instagram-oauth', {
        body: {
          action: 'check_connection',
          state: 'default_user' // You might want to use actual user ID
        }
      });

      if (!error && data.success && data.connected) {
        setConnectedPlatforms(prev => {
          if (!prev.includes('instagram')) {
            return [...prev, 'instagram'];
          }
          return prev;
        });
      } else {
        setConnectedPlatforms(prev => prev.filter(p => p !== 'instagram'));
      }
    } catch (error) {
      console.error('Error checking connected platforms:', error);
      setConnectedPlatforms(prev => prev.filter(p => p !== 'instagram'));
    } finally {
      setIsCheckingConnections(false);
    }
  };

  const generatePlatformContent = async () => {
    setIsGeneratingContent(true);
    
    try {
      // Determine which platforms to generate content for
      const platformsToGenerate = selectedChannels.length > 0 
        ? selectedChannels.filter(channel => platforms[channel]) 
        : Object.keys(platforms);

      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'social_content',
          instruction: instruction,
          imageUrl: imageUrl,
          selectedPlatforms: platformsToGenerate,
          formatSpecs: formatSpecs,
          productInfo: {
            name: "Product", // This could be passed as prop if needed
            description: instruction
          }
        }
      });

      if (error) throw error;

      // Create content object - only for selected platforms or all if none selected
      const generatedContent: Record<string, PlatformContent> = {};
      
      if (data.success && data.result) {
        try {
          // Try to parse as JSON first (new format)
          const parsedContent = JSON.parse(data.result);
          Object.keys(parsedContent).forEach(platform => {
            if (platforms[platform] && parsedContent[platform]) {
              // Clean up the content by removing technical specifications
              const cleanCaption = parsedContent[platform].caption 
                ? parsedContent[platform].caption.replace(/#\w+:\s*[^\n#]*/g, '').trim()
                : instruction.replace(/#\w+:\s*[^\n#]*/g, '').trim();
              
              generatedContent[platform] = {
                caption: cleanCaption || `${instruction}`,
                hashtags: parsedContent[platform].hashtags || "#AI #Design #Creative",
                mentions: parsedContent[platform].mentions || ""
              };
            }
          });
        } catch (parseError) {
          // Fallback to old format if JSON parsing fails
          console.log('Using fallback content generation');
          platformsToGenerate.forEach(platform => {
            const cleanInstruction = instruction.replace(/#\w+:\s*[^\n#]*/g, '').trim();
            generatedContent[platform] = {
              caption: cleanInstruction || instruction,
              hashtags: "#AI #Design #Creative",
              mentions: ""
            };
          });
        }
      } else {
        // Fallback content for selected platforms only
        platformsToGenerate.forEach(platform => {
          generatedContent[platform] = {
            caption: `${instruction}`,
            hashtags: "#AI #Design #Creative", 
            mentions: ""
          };
        });
      }

      setPlatformContent(generatedContent);

      toast({
        title: "Content Generated",
        description: "Platform-specific social media content has been created for all platforms!",
      });

    } catch (error) {
      console.error('Error generating social content:', error);
      toast({
        title: "Content Generation Failed",
        description: "Using default content templates.",
        variant: "destructive",
      });

      // Fallback content
      const fallbackContent = Object.keys(platforms).reduce((acc, platform) => {
        acc[platform] = {
          caption: `${instruction}`,
          hashtags: "#AI #Design #Creative",
          mentions: ""
        };
        return acc;
      }, {} as Record<string, PlatformContent>);

      setPlatformContent(fallbackContent);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const updatePlatformContent = (platform: string, field: keyof PlatformContent, value: string) => {
    setPlatformContent(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const postToPlatform = async (platform: string) => {
    setPostingStatus(prev => ({
      ...prev,
      [platform]: { status: 'posting' }
    }));

    try {
      if (platform === 'instagram') {
        // Real Instagram posting
        const content = platformContent[platform];
        if (!content) {
          throw new Error('No content available for Instagram');
        }

        // Combine caption, hashtags, and mentions
        const fullCaption = [
          content.caption,
          content.hashtags,
          content.mentions
        ].filter(Boolean).join('\n\n');

        const { data, error } = await supabase.functions.invoke('instagram-post', {
          body: {
            userId: 'default_user', // You might want to use actual user ID
            imageUrl: imageUrl,
            caption: fullCaption
          }
        });

        if (error || !data.success) {
          throw new Error(data?.error || 'Failed to post to Instagram');
        }

        setPostingStatus(prev => ({
          ...prev,
          [platform]: { status: 'success', message: 'Posted successfully!' }
        }));
        
        toast({
          title: "Posted Successfully",
          description: `Your content has been posted to Instagram!`,
        });

      } else {
        // Mock API call for other platforms - replace with actual platform APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const success = Math.random() > 0.3; // 70% success rate for demo
        
        if (success) {
          setPostingStatus(prev => ({
            ...prev,
            [platform]: { status: 'success', message: 'Posted successfully!' }
          }));
          
          toast({
            title: "Posted Successfully",
            description: `Your content has been posted to ${platforms[platform]?.name}!`,
          });
        } else {
          throw new Error("Failed to post");
        }
      }
    } catch (error) {
      setPostingStatus(prev => ({
        ...prev,
        [platform]: { status: 'error', message: 'Failed to post' }
      }));
      
      toast({
        title: "Posting Failed",
        description: `Failed to post to ${platforms[platform]?.name}. ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: PostingStatus['status']) => {
    switch (status) {
      case 'posting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Social Media Auto-Post</span>
          {isGeneratingContent && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Generated content for {selectedChannels.length > 0 ? 'selected' : 'all'} platforms. Edit as needed and post to your connected accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform Content Editors - Only show selected platforms that have content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(platforms).map(([key, platform]) => {
            const IconComponent = platform.icon;
            const content = platformContent[key];
            
            // Only show platforms that are selected AND have generated content
            const isSelected = selectedChannels.length > 0 ? selectedChannels.includes(key) : true;
            if (!content || !isSelected) return null;

            return (
              <Card key={key} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-3 text-sm">
                    <IconComponent className="h-5 w-5" />
                    <span>{platform.name}</span>
                    <Edit className="h-3 w-3 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Caption
                    </label>
                    <Textarea
                      value={content.caption}
                      onChange={(e) => updatePlatformContent(key, 'caption', e.target.value)}
                      className="min-h-[80px] text-sm"
                      placeholder="Enter your caption..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Hashtags
                    </label>
                    <Textarea
                      value={content.hashtags}
                      onChange={(e) => updatePlatformContent(key, 'hashtags', e.target.value)}
                      className="min-h-[60px] text-sm"
                      placeholder="#hashtag1 #hashtag2"
                    />
                  </div>

                  {content.mentions && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Mentions
                      </label>
                      <Textarea
                        value={content.mentions}
                        onChange={(e) => updatePlatformContent(key, 'mentions', e.target.value)}
                        className="min-h-[40px] text-sm"
                        placeholder="@username1 @username2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Connected Platforms Posting Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Connected Platforms</h3>
          
          {connectedPlatforms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No platforms connected. Connect your social media accounts to enable auto-posting.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {connectedPlatforms.map((platformKey) => {
                const platform = platforms[platformKey];
                const IconComponent = platform?.icon;
                const status = postingStatus[platformKey]?.status || 'idle';
                
                if (!platform || !IconComponent) return null;

                return (
                  <div key={platformKey} className="flex flex-col items-center space-y-2">
                    <Button
                      onClick={() => postToPlatform(platformKey)}
                      disabled={status === 'posting'}
                      variant="outline"
                      size="lg"
                      className="relative w-20 h-20 rounded-full flex flex-col items-center justify-center"
                    >
                      <IconComponent className="h-6 w-6 mb-1" />
                      <span className="text-xs">{platform.name}</span>
                      
                      {/* Status indicator */}
                      <div className="absolute -top-1 -right-1">
                        {getStatusIcon(status)}
                      </div>
                    </Button>
                    
                    {status !== 'idle' && (
                      <Badge 
                        variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {status === 'posting' && 'Posting...'}
                        {status === 'success' && 'Posted'}
                        {status === 'error' && 'Failed'}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
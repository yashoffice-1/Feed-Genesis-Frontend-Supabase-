import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useInstagramAuth } from "@/hooks/useInstagramAuth";
import { useYouTubeAuth } from "@/hooks/useYouTubeAuth";
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube, 
  CheckCircle,
  Plus,
  Settings,
  Unlink,
  Loader2
} from "lucide-react";

interface SocialChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  connected: boolean;
  accountName?: string;
}

export function SocialProfiles() {
  const { toast } = useToast();
  const { 
    connect: connectInstagram, 
    disconnect: disconnectInstagram, 
    isConnecting: isInstagramConnecting, 
    isConnected: isInstagramConnected,
    userInfo: instagramUserInfo
  } = useInstagramAuth();
  const { 
    connect: connectYouTube, 
    disconnect: disconnectYouTube, 
    isConnecting: isYouTubeConnecting, 
    isConnected: isYouTubeConnected,
    userInfo: youTubeUserInfo
  } = useYouTubeAuth();
  const [loadingChannels, setLoadingChannels] = useState<string[]>([]);
  const [channels, setChannels] = useState<SocialChannel[]>([
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      connected: false
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      connected: true,
      accountName: "@mybrand"
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: Linkedin,
      connected: false
    },
    {
      id: "twitter",
      name: "Twitter / X",
      icon: Twitter,
      connected: false
    },
    {
      id: "youtube",
      name: "YouTube",
      icon: Youtube,
      connected: false
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: () => (
        <div className="h-4 w-4 bg-foreground rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-background">T</span>
        </div>
      ),
      connected: false
    },
    {
      id: "pinterest",
      name: "Pinterest",
      icon: () => (
        <div className="h-4 w-4 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">P</span>
        </div>
      ),
      connected: false
    },
    {
      id: "google-ads",
      name: "Google Ads",
      icon: () => (
        <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-white">G</span>
        </div>
      ),
      connected: false
    }
  ]);

  useEffect(() => {
    // Update channel status based on hook states
    setChannels(prev => prev.map(channel => {
      if (channel.id === 'instagram') {
        return { 
          ...channel, 
          connected: isInstagramConnected,
          accountName: instagramUserInfo ? `@${instagramUserInfo.username}` : undefined
        };
      }
      if (channel.id === 'youtube') {
        return { 
          ...channel, 
          connected: isYouTubeConnected,
          accountName: youTubeUserInfo ? youTubeUserInfo.channelTitle : undefined
        };
      }
      return channel;
    }));
  }, [isInstagramConnected, instagramUserInfo, isYouTubeConnected, youTubeUserInfo]);

    const handleConnect = async (channelId: string) => {
    if (channelId === 'instagram') {
      await connectInstagram();
    } else if (channelId === 'youtube') {
      await connectYouTube();
    } else {
      toast({
        title: "Integration Coming Soon",
        description: `${channels.find(c => c.id === channelId)?.name} integration will be available soon.`,
      });
    }
  };

    const handleDisconnect = async (channelId: string) => {
    if (channelId === 'instagram') {
      await disconnectInstagram();
    } else if (channelId === 'youtube') {
      await disconnectYouTube();
    } else {
      setChannels(prev => 
        prev.map(channel => 
          channel.id === channelId 
            ? { ...channel, connected: false, accountName: undefined }
            : channel
        )
      );
      toast({
        title: "Account Disconnected",
        description: `Successfully disconnected from ${channels.find(c => c.id === channelId)?.name}.`,
      });
    }
  };

  const handleManage = (channelId: string) => {
    toast({
      title: "Manage Account",
      description: `Opening management settings for ${channels.find(c => c.id === channelId)?.name}.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Social Media Integrations</CardTitle>
          <CardDescription>
            Connect your social media and advertising accounts to streamline content publishing and campaign management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const IconComponent = channel.icon;
              return (
                <Card key={channel.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-6 w-6" />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      {channel.connected && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </Badge>
                      )}
                    </div>
                    
                    {channel.connected && channel.accountName && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {channel.accountName}
                      </p>
                    )}
                    
                    <div className="flex space-x-2">
                      {!channel.connected ? (
                        <Button 
                          onClick={() => handleConnect(channel.id)}
                          size="sm"
                          className="flex-1"
                                                    disabled={
                            channel.id === 'instagram' ? isInstagramConnecting : 
                            channel.id === 'youtube' ? isYouTubeConnecting :
                            loadingChannels.includes(channel.id)
                          }
                        >
                          {(
                            channel.id === 'instagram' ? isInstagramConnecting : 
                            channel.id === 'youtube' ? isYouTubeConnecting :
                            loadingChannels.includes(channel.id)
                          ) ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3 mr-1" />
                          )}
                          {(
                            channel.id === 'instagram' ? isInstagramConnecting : 
                            channel.id === 'youtube' ? isYouTubeConnecting :
                            loadingChannels.includes(channel.id)
                          ) ? 'Connecting...' : 'Connect'}
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleManage(channel.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={loadingChannels.includes(channel.id)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          <Button 
                            onClick={() => handleDisconnect(channel.id)}
                            variant="outline"
                            size="sm"
                                                        disabled={
                              channel.id === 'instagram' ? isInstagramConnecting : 
                              channel.id === 'youtube' ? isYouTubeConnecting :
                              loadingChannels.includes(channel.id)
                            }
                          >
                            {(
                              channel.id === 'instagram' ? isInstagramConnecting : 
                              channel.id === 'youtube' ? isYouTubeConnecting :
                              loadingChannels.includes(channel.id)
                            ) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Unlink className="h-3 w-3" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
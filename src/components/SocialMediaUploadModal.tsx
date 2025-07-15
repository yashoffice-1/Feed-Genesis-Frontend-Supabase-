import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSocialMediaUpload } from '@/hooks/useSocialMediaUpload';
import { 
  Upload, 
  Youtube, 
  Instagram, 
  Facebook, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Linkedin,
  Twitter,
  RefreshCw
} from 'lucide-react';

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

interface AssetToUpload {
  id: string;
  title: string;
  asset_type: 'image' | 'video' | 'content';
  asset_url: string;
  description?: string;
  tags?: string[];
}

interface SocialMediaUploadModalProps {
  asset: AssetToUpload;
  children: React.ReactNode;
}

const platformIcons = {
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
};

const platformColors = {
  youtube: 'bg-red-500',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
  twitter: 'bg-sky-500',
};

export function SocialMediaUploadModal({ asset, children }: SocialMediaUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<SocialConnection[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  const { uploadToSocialMedia, getConnectedPlatforms, isUploading, uploadingPlatforms } = useSocialMediaUpload();
  const { toast } = useToast();

  // Debug: Log when modal opens
  useEffect(() => {
    console.log('🚀 SocialMediaUploadModal - Modal open state changed:', isOpen);
    if (isOpen) {
      console.log('🎯 Modal opened for asset:', asset);
      loadConnectedPlatforms();
    }
  }, [isOpen]);

  const loadConnectedPlatforms = async () => {
    console.log('🔍 Loading connected platforms...');
    setLoadingPlatforms(true);
    
    try {
      const platforms = await getConnectedPlatforms();
      console.log('📋 Platforms loaded:', platforms);
      setConnectedPlatforms(platforms);
      
      // Update debug info
      setDebugInfo({
        modalOpen: isOpen,
        platformCount: platforms.length,
        platforms: platforms.map(p => ({
          platform: p.platform,
          displayName: p.platform_display_name,
          hasToken: !!p.access_token,
          isActive: p.is_active
        })),
        assetType: asset.asset_type,
        assetUrl: asset.asset_url ? 'Available' : 'Missing',
        localStorage: {
          youtubeUserInfo: !!localStorage.getItem('youtube_user_info'),
          youtubeToken: !!localStorage.getItem('youtube_access_token'),
          youtubeExpiry: localStorage.getItem('youtube_expires_at'),
          instagramUserInfo: !!localStorage.getItem('instagram_user_info'),
          instagramToken: !!localStorage.getItem('instagram_access_token'),
        }
      });
      
      // Auto-select compatible platforms
      const compatiblePlatforms = platforms.filter(p => {
        if (asset.asset_type === 'video') {
          return p.platform === 'youtube' || p.platform === 'facebook';
        } else if (asset.asset_type === 'image') {
          return p.platform === 'instagram' || p.platform === 'facebook';
        }
        return false;
      });
      
      console.log('✅ Compatible platforms:', compatiblePlatforms.map(p => p.platform));
      setSelectedPlatforms(compatiblePlatforms.map(p => p.platform));
    } catch (error) {
      console.error('❌ Error loading platforms:', error);
      setDebugInfo(prev => ({ ...prev, error: error.message }));
      toast({
        title: "Error",
        description: "Failed to load connected platforms: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleUpload = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No Platforms Selected",
        description: "Please select at least one platform to upload to.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await uploadToSocialMedia(asset, selectedPlatforms);
      setUploadResults(results);
      setShowResults(true);
      
      // If all uploads were successful, close modal after a delay
      if (results.every(r => r.success)) {
        setTimeout(() => {
          setIsOpen(false);
          setShowResults(false);
          setUploadResults([]);
        }, 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleModalClose = () => {
    setIsOpen(false);
    setShowResults(false);
    setUploadResults([]);
    setSelectedPlatforms([]);
  };

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform as keyof typeof platformIcons];
    return Icon ? <Icon className="h-5 w-5" /> : <Upload className="h-5 w-5" />;
  };

  const getPlatformColor = (platform: string) => {
    return platformColors[platform as keyof typeof platformColors] || 'bg-gray-500';
  };

  const isPlatformCompatible = (platform: string) => {
    if (asset.asset_type === 'video') {
      return platform === 'youtube' || platform === 'facebook';
    } else if (asset.asset_type === 'image') {
      return platform === 'instagram' || platform === 'facebook';
    } else if (asset.asset_type === 'content') {
      return platform === 'twitter' || platform === 'linkedin' || platform === 'facebook';
    }
    return false;
  };

  const getCompatibilityMessage = (platform: string) => {
    if (!isPlatformCompatible(platform)) {
      if (asset.asset_type === 'video' && platform === 'instagram') {
        return 'Instagram videos require special handling - use manual upload';
      } else if (asset.asset_type === 'image' && platform === 'youtube') {
        return 'YouTube requires video content';
      } else if (asset.asset_type === 'content') {
        return 'Content posting not yet supported for this platform';
      }
      return 'Not compatible with this asset type';
    }
    return '';
  };

  const addTestConnection = () => {
    // Add YouTube test connection
    const testConnection = {
      channelTitle: 'Test YouTube Channel',
      channelId: 'test-channel-id',
      subscriberCount: '1000',
      videoCount: '50'
    };
    localStorage.setItem('youtube_user_info', JSON.stringify(testConnection));
    localStorage.setItem('youtube_access_token', 'demo_access_token_youtube');
    localStorage.setItem('youtube_expires_at', new Date(Date.now() + 3600000).toISOString());
    
    // Add Instagram test connection
    const instagramTest = {
      id: 'test-instagram-id',
      username: 'test_instagram_user'
    };
    localStorage.setItem('instagram_user_info', JSON.stringify(instagramTest));
    localStorage.setItem('instagram_access_token', 'demo_access_token_instagram');
    
    // Add Facebook test connection
    const facebookTest = {
      id: 'test-facebook-id',
      name: 'Test Facebook User',
      email: 'test@example.com'
    };
    localStorage.setItem('facebook_user_info', JSON.stringify(facebookTest));
    localStorage.setItem('facebook_access_token', 'demo_access_token_facebook');
    
    // Reload platforms
    loadConnectedPlatforms();
    
    toast({
      title: "Test Connections Added",
      description: "Added test connections for YouTube, Instagram, and Facebook",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => {
        console.log('🎯 Modal trigger clicked');
        setIsOpen(true);
      }}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload to Social Media
          </DialogTitle>
          <DialogDescription>
            Upload "{asset.title}" to your connected social media platforms
          </DialogDescription>
        </DialogHeader>

        {/* Debug Section - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-3 rounded text-xs space-y-1">
            <div><strong>🔍 Debug Info:</strong></div>
            <div>Modal Open: {isOpen ? 'Yes' : 'No'}</div>
            <div>Loading Platforms: {loadingPlatforms ? 'Yes' : 'No'}</div>
            <div>Connected Platforms: {connectedPlatforms.length}</div>
            <div>Selected Platforms: {selectedPlatforms.length}</div>
            <div>Asset Type: {asset.asset_type}</div>
            <div>Asset URL: {asset.asset_url ? 'Available' : 'Missing'}</div>
            {connectedPlatforms.length > 0 && (
              <div>Platforms: {connectedPlatforms.map(p => p.platform).join(', ')}</div>
            )}
            {Object.keys(debugInfo).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Show Debug Details</summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={addTestConnection}
              >
                Add Test Connections
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  console.log('🔄 Refreshing platforms...');
                  loadConnectedPlatforms();
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Asset Preview */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
              {asset.asset_type === 'video' ? (
                <video 
                  src={asset.asset_url} 
                  className="w-full h-full object-cover"
                  muted
                />
              ) : asset.asset_type === 'image' ? (
                <img 
                  src={asset.asset_url} 
                  alt={asset.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100">
                  <span className="text-xs font-medium text-blue-600">TXT</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">{asset.title}</h4>
              <p className="text-xs text-gray-600 mt-1">
                Type: {asset.asset_type} | {asset.description && `${asset.description.substring(0, 50)}...`}
              </p>
              {asset.tags && asset.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {asset.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {asset.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{asset.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection Type Indicator */}
        {connectedPlatforms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Connection Status</span>
            </div>
            <div className="mt-1 text-xs text-blue-700">
              {connectedPlatforms.map(platform => {
                const isTestConnection = (
                  platform.access_token === 'demo_access_token_youtube' ||
                  platform.access_token === 'demo_access_token_instagram' ||
                  platform.access_token === 'demo_access_token_facebook'
                );
                
                return (
                  <div key={platform.id} className="flex items-center justify-between py-1">
                    <span className="capitalize">{platform.platform}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      isTestConnection 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isTestConnection ? 'Test Mode' : 'Real Connection'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Display */}
        {showResults && uploadResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Upload Results:</h4>
            {uploadResults.map((result, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getPlatformColor(result.platform)}`}>
                  {getPlatformIcon(result.platform)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{result.platform}</span>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                  {result.url && (
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mt-1"
                    >
                      View on {result.platform}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Platform Selection */}
        {!showResults && (
          <div className="space-y-4">
            {loadingPlatforms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading connected platforms...</span>
              </div>
            ) : connectedPlatforms.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No Connected Platforms</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You need to connect at least one social media platform first. 
                  Use the "Add Test Connections" button below to simulate connections for testing.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={addTestConnection} variant="default">
                    Add Test Connections
                  </Button>
                  <Button onClick={handleModalClose} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="font-medium text-sm mb-3">Select platforms to upload to:</h4>
                  <div className="grid gap-3">
                    {connectedPlatforms.map((platform) => {
                      const isCompatible = isPlatformCompatible(platform.platform);
                      const isUploading = uploadingPlatforms.includes(platform.platform);
                      const compatibilityMessage = getCompatibilityMessage(platform.platform);
                      
                      return (
                        <Card 
                          key={platform.id} 
                          className={`cursor-pointer transition-all ${
                            !isCompatible 
                              ? 'opacity-50 cursor-not-allowed' 
                              : selectedPlatforms.includes(platform.platform) 
                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                : 'hover:bg-gray-50'
                          }`}
                          onClick={() => isCompatible && handlePlatformToggle(platform.platform)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getPlatformColor(platform.platform)}`}>
                                  {getPlatformIcon(platform.platform)}
                                </div>
                                <div>
                                  <CardTitle className="text-sm capitalize">
                                    {platform.platform}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {platform.platform_display_name || platform.platform_username || 'Connected Account'}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isUploading && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                )}
                                {isCompatible && (
                                  <Checkbox 
                                    checked={selectedPlatforms.includes(platform.platform)}
                                    onChange={() => handlePlatformToggle(platform.platform)}
                                  />
                                )}
                              </div>
                            </div>
                            {!isCompatible && compatibilityMessage && (
                              <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                {compatibilityMessage}
                              </div>
                            )}
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={selectedPlatforms.length === 0 || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 
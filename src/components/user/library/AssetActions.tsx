
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SocialMediaUploadModal } from "@/components/SocialMediaUploadModal";
import { 
  Share2, 
  Mail, 
  MessageSquare, 
  Copy, 
  Download,
  Image as ImageIcon,
  Save,
  Upload
} from "lucide-react";

interface LibraryAsset {
  id: string;
  title: string;
  type: 'video' | 'image' | 'content';
  url: string;
  gif_url?: string;
  thumbnail?: string;
  createdAt: string;
  favorited: boolean;
  status: 'completed' | 'processing' | 'failed';
}

interface AssetActionsProps {
  asset: LibraryAsset;
}

export function AssetActions({ asset }: AssetActionsProps) {
  const { toast } = useToast();

  const handleShare = (method: 'email' | 'sms' | 'whatsapp' | 'copy', asset: LibraryAsset, isGif: boolean = false) => {
    const shareUrl = isGif && asset.gif_url 
      ? asset.gif_url 
      : `${window.location.origin}/share/${asset.id}`;
    const shareText = isGif 
      ? `Check out this GIF preview: ${asset.title}` 
      : `Check out this video: ${asset.title}`;

    switch (method) {
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(asset.title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Copied",
          description: `${isGif ? 'GIF' : 'Video'} link has been copied to clipboard.`,
        });
        break;
    }
  };

  const handleDownload = (asset: LibraryAsset, isGif: boolean = false) => {
    const url = isGif && asset.gif_url ? asset.gif_url : asset.url;
    const filename = isGif ? `${asset.title}.gif` : `${asset.title}.mp4`;
    
    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: `${isGif ? 'GIF' : 'Video'} download has started.`,
    });
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Social Media Upload section */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Upload className="h-4 w-4" />
          <span className="text-sm font-medium">Upload to Social Media:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <SocialMediaUploadModal 
            asset={{
              id: asset.id,
              title: asset.title,
              asset_type: asset.type,
              asset_url: asset.url,
              description: `Generated with FeedGenesis - ${asset.title}`,
              tags: [asset.type, 'feedgenesis']
            }}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <Upload className="h-3 w-3" />
              <span>Upload to Platforms</span>
            </Button>
          </SocialMediaUploadModal>
        </div>
      </div>

      {/* Video sharing section */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Share2 className="h-4 w-4" />
          <span className="text-sm font-medium">Share Video:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('email', asset)}
            className="flex items-center space-x-1"
          >
            <Mail className="h-3 w-3" />
            <span>Email</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('whatsapp', asset)}
            className="flex items-center space-x-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <MessageSquare className="h-3 w-3" />
            <span>WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare('copy', asset)}
            className="flex items-center space-x-1"
          >
            <Copy className="h-3 w-3" />
            <span>Copy Link</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(asset)}
            className="flex items-center space-x-1"
          >
            <Download className="h-3 w-3" />
            <span>Download</span>
          </Button>
        </div>
      </div>

      {/* GIF sharing section - only show if GIF URL exists */}
      {asset.gif_url && (
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <ImageIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Share GIF Preview:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('email', asset, true)}
              className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            >
              <Mail className="h-3 w-3" />
              <span>Email GIF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('whatsapp', asset, true)}
              className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            >
              <MessageSquare className="h-3 w-3" />
              <span>WhatsApp GIF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('copy', asset, true)}
              className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            >
              <Copy className="h-3 w-3" />
              <span>Copy GIF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(asset, true)}
              className="flex items-center space-x-1 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            >
              <Download className="h-3 w-3" />
              <span>Download GIF</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

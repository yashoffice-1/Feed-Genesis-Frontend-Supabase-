
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadAndStoreAsset } from '@/utils/assetStorage';

export interface AssetLibraryItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  asset_type: 'image' | 'video' | 'content' | 'formats' | 'ad';
  asset_url: string;
  gif_url?: string;
  content?: string;
  instruction: string;
  source_system: 'runway' | 'heygen' | 'openai';
  original_asset_id?: string;
  favorited: boolean;
  created_at: string;
  updated_at: string;
}

export function useAssetLibrary() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveToLibrary = async (asset: {
    title: string;
    description?: string;
    tags?: string[];
    asset_type: 'image' | 'video' | 'content' | 'formats' | 'ad';
    asset_url: string;
    content?: string;
    instruction: string;
    source_system: 'runway' | 'heygen' | 'openai';
    original_asset_id?: string;
  }) => {
    setIsLoading(true);
    try {
      let finalAssetUrl = asset.asset_url;
      let storedFileName: string | undefined;

      // Only download and store if it's not a content/formats type and the URL is external
      if (asset.asset_type !== 'content' && asset.asset_type !== 'formats' && asset.asset_url && !asset.asset_url.includes('supabase')) {
        toast({
          title: "Processing Asset",
          description: "Downloading and storing your asset...",
        });

        try {
          const downloadedAsset = await downloadAndStoreAsset(
            asset.asset_url,
            asset.asset_type === 'ad' ? 'image' : asset.asset_type, // Map 'ad' to 'image' for storage
            `${asset.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
          );
          finalAssetUrl = downloadedAsset.url;
          storedFileName = downloadedAsset.fileName;
        } catch (downloadError) {
          console.warn('Failed to download asset, using original URL:', downloadError);
          // Continue with original URL if download fails
        }
      }

      const { data, error } = await supabase
        .from('asset_library')
        .insert([{
          ...asset,
          asset_url: finalAssetUrl
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Asset Saved",
        description: storedFileName 
          ? "Asset has been downloaded and saved to your library successfully!" 
          : "Asset has been saved to your library successfully!",
      });

      return data;
    } catch (error) {
      console.error('Error saving asset to library:', error);
      toast({
        title: "Error",
        description: "Failed to save asset to library.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getLibraryAssets = async (filters?: {
    asset_type?: string;
    favorited?: boolean;
    tags?: string[];
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('asset_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.asset_type) {
        query = query.eq('asset_type', filters.asset_type);
      }

      if (filters?.favorited !== undefined) {
        query = query.eq('favorited', filters.favorited);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AssetLibraryItem[];
    } catch (error) {
      console.error('Error fetching library assets:', error);
      toast({
        title: "Error",
        description: "Failed to load library assets.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (id: string, favorited: boolean) => {
    try {
      const { error } = await supabase
        .from('asset_library')
        .update({ favorited, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: favorited ? "Added to Favorites" : "Removed from Favorites",
        description: `Asset ${favorited ? 'added to' : 'removed from'} favorites.`,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
    }
  };

  const deleteFromLibrary = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_library')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Asset Deleted",
        description: "Asset has been removed from your library.",
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset from library.",
        variant: "destructive",
      });
    }
  };

  return {
    saveToLibrary,
    getLibraryAssets,
    toggleFavorite,
    deleteFromLibrary,
    isLoading,
  };
}

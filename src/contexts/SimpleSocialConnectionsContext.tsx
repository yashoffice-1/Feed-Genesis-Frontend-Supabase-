import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
interface SocialConnection {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  metadata: any;
  connected_at: string;
  updated_at: string;
  is_active: boolean;
}

interface SocialConnectionsContextType {
  connections: Record<string, SocialConnection>;
  isLoading: boolean;
  refreshConnections: () => Promise<void>;
  getConnection: (platform: string) => SocialConnection | null;
  isConnected: (platform: string) => boolean;
  getConnectedPlatforms: () => string[];
}

// Context
const SocialConnectionsContext = createContext<SocialConnectionsContextType | undefined>(undefined);

// Provider component
interface SocialConnectionsProviderProps {
  children: ReactNode;
}

export function SocialConnectionsProvider({ children }: SocialConnectionsProviderProps) {
  const [connections, setConnections] = useState<Record<string, SocialConnection>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch connections from database
  const refreshConnections = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('user_social_connections')
        .select('*')
        .eq('user_id', 'default_user')
        .eq('is_active', true)
        .order('connected_at', { ascending: false });

      if (error) {
        console.log('Database not ready, using mock data:', error.message);
        // Add mock Facebook connection for demo purposes when database is not available
        const mockConnections: SocialConnection[] = [{
          id: 'mock-facebook',
          user_id: 'default_user',
          platform: 'facebook',
          platform_user_id: 'demo_facebook_id',
          platform_username: 'mybrand',
          platform_display_name: 'My Brand',
          access_token: 'demo_access_token_facebook',
          refresh_token: null,
          token_expires_at: null,
          scope: 'pages_manage_posts,pages_read_engagement',
          metadata: { page_id: 'demo_page_id', page_name: 'My Brand Page' },
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        }];
        const connectionsMap = mockConnections.reduce((acc, conn) => {
          acc[conn.platform] = conn;
          return acc;
        }, {} as Record<string, SocialConnection>);
        setConnections(connectionsMap);
        return;
      }

      const connectionsArray = (data || []) as SocialConnection[];
      const connectionsMap = connectionsArray.reduce((acc, conn) => {
        acc[conn.platform] = conn;
        return acc;
      }, {} as Record<string, SocialConnection>);
      setConnections(connectionsMap);
    } catch (error) {
      console.error('Error refreshing social connections:', error);
      setConnections({});
    } finally {
      setIsLoading(false);
    }
  };

  // Get connection by platform
  const getConnection = (platform: string): SocialConnection | null => {
    return connections[platform] || null;
  };

  // Check if platform is connected
  const isConnected = (platform: string): boolean => {
    const connection = connections[platform];
    return connection && connection.is_active;
  };

  // Get list of connected platforms
  const getConnectedPlatforms = (): string[] => {
    return Object.keys(connections).filter(platform => 
      connections[platform].is_active
    );
  };

  // Load connections on mount
  useEffect(() => {
    refreshConnections();
  }, []);

  const contextValue: SocialConnectionsContextType = {
    connections,
    isLoading,
    refreshConnections,
    getConnection,
    isConnected,
    getConnectedPlatforms,
  };

  return (
    <SocialConnectionsContext.Provider value={contextValue}>
      {children}
    </SocialConnectionsContext.Provider>
  );
}

// Custom hook to use the context
export function useSocialConnections() {
  const context = useContext(SocialConnectionsContext);
  if (context === undefined) {
    throw new Error('useSocialConnections must be used within a SocialConnectionsProvider');
  }
  return context;
}

// Export types for external use
export type { SocialConnection, SocialConnectionsContextType }; 
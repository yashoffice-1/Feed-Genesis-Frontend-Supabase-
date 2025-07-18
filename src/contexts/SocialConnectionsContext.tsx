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

interface SocialConnectionsState {
  connections: Record<string, SocialConnection>;
  isLoading: boolean;
  lastUpdated: Date | null;
}

interface SocialConnectionsContextType {
  state: SocialConnectionsState;
  actions: {
    refreshConnections: () => Promise<void>;
    getConnection: (platform: string) => SocialConnection | null;
    isConnected: (platform: string) => boolean;
    getConnectedPlatforms: () => string[];
    isTokenExpired: (platform: string) => boolean;
    addConnection: (connection: SocialConnection) => void;
    updateConnection: (connection: SocialConnection) => void;
    removeConnection: (platform: string) => void;
  };
}

// Initial state
const initialState: SocialConnectionsState = {
  connections: {},
  isLoading: false,
  lastUpdated: null,
};

// Reducer
function socialConnectionsReducer(state: SocialConnectionsState, action: SocialConnectionsAction): SocialConnectionsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_CONNECTIONS':
      const connectionsMap = action.payload.reduce((acc, conn) => {
        acc[conn.platform] = conn;
        return acc;
      }, {} as Record<string, SocialConnection>);
      return { ...state, connections: connectionsMap };
    
    case 'ADD_CONNECTION':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.platform]: action.payload,
        },
      };
    
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: {
          ...state.connections,
          [action.payload.platform]: action.payload,
        },
      };
    
    case 'REMOVE_CONNECTION':
      const newConnections = { ...state.connections };
      delete newConnections[action.payload];
      return { ...state, connections: newConnections };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    default:
      return state;
  }
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
        console.log('Database not ready or table does not exist:', error.message);
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
        setLastUpdated(new Date());
        return;
      }

      const connectionsArray = (data || []) as SocialConnection[];
      const connectionsMap = connectionsArray.reduce((acc, conn) => {
        acc[conn.platform] = conn;
        return acc;
      }, {} as Record<string, SocialConnection>);
      setConnections(connectionsMap);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing social connections:', error);
      // Fallback to empty connections on error
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

  // Check if token is expired
  const isTokenExpired = (platform: string): boolean => {
    const connection = connections[platform];
    if (!connection || !connection.token_expires_at) return false;
    
    return new Date(connection.token_expires_at) < new Date();
  };

  // Add new connection
  const addConnection = (connection: SocialConnection) => {
    setConnections(prev => ({
      ...prev,
      [connection.platform]: connection
    }));
  };

  // Update existing connection
  const updateConnection = (connection: SocialConnection) => {
    setConnections(prev => ({
      ...prev,
      [connection.platform]: connection
    }));
  };

  // Remove connection
  const removeConnection = (platform: string) => {
    setConnections(prev => {
      const newConnections = { ...prev };
      delete newConnections[platform];
      return newConnections;
    });
  };

  // Load connections on mount
  useEffect(() => {
    refreshConnections();
  }, []);

  // Set up real-time subscription for connection changes (disabled until database is ready)
  useEffect(() => {
    // TODO: Enable real-time subscription once database is set up
    // const subscription = supabase
    //   .channel('social_connections')
    //   .on('postgres_changes', {
    //     event: '*',
    //     schema: 'public',
    //     table: 'user_social_connections',
    //     filter: 'user_id=eq.default_user'
    //   }, (payload) => {
    //     console.log('Social connection changed:', payload);
    //     
    //     // Refresh connections when changes occur
    //     refreshConnections();
    //   })
    //   .subscribe();

    // return () => {
    //   subscription.unsubscribe();
    // };
  }, []);

  const contextValue: SocialConnectionsContextType = {
    state: {
      connections,
      isLoading,
      lastUpdated
    },
    actions: {
      refreshConnections,
      getConnection,
      isConnected,
      getConnectedPlatforms,
      isTokenExpired,
      addConnection,
      updateConnection,
      removeConnection,
    },
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
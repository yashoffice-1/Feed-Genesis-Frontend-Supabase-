-- Create user_social_connections table for storing OAuth tokens and platform connections
CREATE TABLE public.user_social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  platform TEXT NOT NULL, -- 'youtube', 'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'pinterest'
  platform_user_id TEXT, -- User ID from the platform
  platform_username TEXT, -- Username/handle from the platform
  platform_display_name TEXT, -- Display name from the platform
  access_token TEXT NOT NULL, -- OAuth access token
  refresh_token TEXT, -- OAuth refresh token (if applicable)
  token_expires_at TIMESTAMP WITH TIME ZONE, -- When the access token expires
  scope TEXT, -- OAuth scopes granted
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  -- Additional platform-specific metadata
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, platform)
);

-- Enable RLS on the table
ALTER TABLE public.user_social_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can manage their own social connections" ON public.user_social_connections
  FOR ALL USING (user_id = 'default_user'); -- For now using default user

-- Create indexes for better performance
CREATE INDEX idx_user_social_connections_user_id ON public.user_social_connections(user_id);
CREATE INDEX idx_user_social_connections_platform ON public.user_social_connections(platform);
CREATE INDEX idx_user_social_connections_active ON public.user_social_connections(user_id, is_active);

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_user_social_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_social_connections_updated_at 
  BEFORE UPDATE ON public.user_social_connections 
  FOR EACH ROW EXECUTE PROCEDURE update_user_social_connections_updated_at();

-- Insert mock Facebook connection for demo purposes
INSERT INTO public.user_social_connections (
  user_id, 
  platform, 
  platform_user_id, 
  platform_username, 
  platform_display_name, 
  access_token, 
  scope,
  metadata
) VALUES (
  'default_user',
  'facebook',
  'demo_facebook_id',
  'mybrand',
  'My Brand',
  'demo_access_token_facebook',
  'pages_manage_posts,pages_read_engagement',
  '{"page_id": "demo_page_id", "page_name": "My Brand Page"}'
); 
-- Complete Database Setup for Enhanced Product Generator
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/tgfqyjbsrubynkxhpdpt/sql

-- 1. Create generated_assets table (must be first as other tables reference it)
CREATE TABLE IF NOT EXISTS public.generated_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id TEXT, 
  channel TEXT NOT NULL CHECK (channel IN ('youtube', 'facebook', 'instagram', 'tiktok')),
  format TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('openai', 'runway', 'heygen')),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video')),
  url TEXT NOT NULL,
  instruction TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create inventory table (THIS IS WHAT YOU NEED FOR ENHANCED PRODUCT GENERATOR)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  sku TEXT UNIQUE,
  category TEXT,
  brand TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create asset_library table
CREATE TABLE IF NOT EXISTS public.asset_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'content')),
  asset_url TEXT NOT NULL,
  gif_url TEXT,
  content TEXT,
  instruction TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('runway', 'heygen', 'openai')),
  original_asset_id UUID REFERENCES public.generated_assets(id),
  favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create user_social_connections table
CREATE TABLE IF NOT EXISTS public.user_social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, platform)
);

-- 5. Create client_configs table
CREATE TABLE IF NOT EXISTS public.client_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_name ON public.inventory USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);

-- 7. Create update function for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_configs ENABLE ROW LEVEL SECURITY;

-- 10. Create policies (allowing all operations for simplicity)
DROP POLICY IF EXISTS "Allow all operations on inventory" ON public.inventory;
CREATE POLICY "Allow all operations on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on generated_assets" ON public.generated_assets;
CREATE POLICY "Allow all operations on generated_assets" ON public.generated_assets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on asset_library" ON public.asset_library;
CREATE POLICY "Allow all operations on asset_library" ON public.asset_library FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on user_social_connections" ON public.user_social_connections;
CREATE POLICY "Allow all operations on user_social_connections" ON public.user_social_connections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on client_configs" ON public.client_configs;
CREATE POLICY "Allow all operations on client_configs" ON public.client_configs FOR ALL USING (true) WITH CHECK (true);

-- 11. Insert sample data so Enhanced Product Generator shows products
INSERT INTO public.inventory (name, description, price, category, brand, images, sku) VALUES 
('Premium Wireless Headphones', 'High-quality audio experience with active noise cancellation technology. Perfect for music lovers and professionals.', 299.99, 'Electronics', 'AudioTech Pro', ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'], 'ATH-WH001'),
('Smart Fitness Watch', 'Advanced fitness tracking with heart rate monitoring, GPS, and 7-day battery life. Track your health goals with style.', 199.99, 'Wearables', 'FitTech', ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'], 'FTW-SF002'),
('Organic Coffee Beans', 'Premium single-origin Ethiopian coffee beans from sustainable farms. Rich, smooth flavor with notes of chocolate and berries.', 24.99, 'Food & Beverage', 'CoffeePlus', ARRAY['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500'], 'CP-OCB003'),
('Wireless Phone Charger', 'Fast 15W wireless charging for all Qi-compatible devices. Sleek design with LED indicator and foreign object detection.', 49.99, 'Electronics', 'ChargeTech', ARRAY['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500'], 'CT-WPC004'),
('Yoga Mat Premium', 'Eco-friendly TPE yoga mat with superior grip and cushioning. Perfect for all yoga practices and fitness routines.', 79.99, 'Fitness', 'ZenFit', ARRAY['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'], 'ZF-YMP005'),
('Bluetooth Speaker', 'Portable waterproof speaker with 360-degree sound and 20-hour battery life. Perfect for outdoor adventures.', 89.99, 'Electronics', 'SoundWave', ARRAY['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500'], 'SW-BTS006')
ON CONFLICT (sku) DO NOTHING;

-- 12. Insert default client configuration
INSERT INTO public.client_configs (client_id, client_name) VALUES ('default', 'Default Client')
ON CONFLICT (client_id) DO NOTHING;

-- Final verification
SELECT 'Database setup completed! 🎉' as status, count(*) as product_count FROM public.inventory; 
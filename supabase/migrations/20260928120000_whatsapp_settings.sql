-- WhatsApp Settings table for Floating Widget and Admin Configuration
CREATE TABLE IF NOT EXISTS whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_phone VARCHAR(20) NOT NULL,
  whatsapp_message TEXT NOT NULL,
  is_widget_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Admins only" ON whatsapp_settings;
DROP POLICY IF EXISTS "Public read" ON whatsapp_settings;

-- Only admins can modify
CREATE POLICY "Admins only" ON whatsapp_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin() OR (auth.jwt() ->> 'role' = 'admin'))
  WITH CHECK (public.is_admin() OR (auth.jwt() ->> 'role' = 'admin'));

-- Public can read (widget needs it)
CREATE POLICY "Public read" ON whatsapp_settings
  FOR SELECT
  TO public
  USING (true);

-- Seed initial data if table is currently empty
INSERT INTO whatsapp_settings (whatsapp_phone, whatsapp_message, is_widget_enabled)
SELECT
  '+201005809498',
  'Hi Mai! 👋 I''d love to learn how you can help my family with parenting, burnout recovery, or coaching. What''s the best way to get started?',
  true
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_settings);

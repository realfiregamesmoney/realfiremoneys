-- Add new customization columns for quiz_events
ALTER TABLE public.quiz_events 
ADD COLUMN IF NOT EXISTS show_estimated_value BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS custom_info_text TEXT DEFAULT 'AO VIVO NO APP • TODA TERÇA ÀS 21H',
ADD COLUMN IF NOT EXISTS custom_info_color TEXT DEFAULT '#EAB308';

-- Refresh cache
NOTIFY pgrst, 'reload schema';

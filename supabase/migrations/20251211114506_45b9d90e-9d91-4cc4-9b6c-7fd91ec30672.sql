-- Add audio support columns to comments table
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_audio BOOLEAN DEFAULT FALSE;

-- Make content nullable to allow audio-only comments
ALTER TABLE public.comments ALTER COLUMN content DROP NOT NULL;
-- Table to store Google OAuth tokens
CREATE TABLE public.tokens_google (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.tokens_google ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can view own tokens"
  ON public.tokens_google
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
  ON public.tokens_google
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
  ON public.tokens_google
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
  ON public.tokens_google
  FOR DELETE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_tokens_google_updated_at
  BEFORE UPDATE ON public.tokens_google
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
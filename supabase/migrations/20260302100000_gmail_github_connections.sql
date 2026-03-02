-- Gmail and GitHub connection tables for teacher/admin integrations

-- ─── Gmail Connections ───
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_address TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- Only the owner can read/write their own row
CREATE POLICY "gmail_connections_owner_only" ON public.gmail_connections
  FOR ALL USING (auth.uid() = user_id);

-- ─── GitHub Connections ───
CREATE TABLE IF NOT EXISTS public.github_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Only the owner can read/write their own row
CREATE POLICY "github_connections_owner_only" ON public.github_connections
  FOR ALL USING (auth.uid() = user_id);

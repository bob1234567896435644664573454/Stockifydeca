-- Perfect Stockify: Phases C-G Schema Additions
-- Adds: user_preferences, learning, journal, challenges, achievements, AI mentor tables

-- ─── Phase C: Onboarding & User Preferences ───

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  experience_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  goal TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  streak_last_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ─── Phase D: Learning Hub ───

CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  estimated_minutes INTEGER DEFAULT 3,
  xp_reward INTEGER DEFAULT 50,
  content_json JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('concept', 'quiz', 'example', 'try_it')),
  payload JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'beginner',
  question TEXT NOT NULL,
  answers JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score NUMERIC,
  attempts INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.mastery_scores (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, topic)
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_paths_read" ON public.learning_paths FOR SELECT USING (true);
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lesson_steps_read" ON public.lesson_steps FOR SELECT USING (true);
CREATE POLICY "question_bank_read" ON public.question_bank FOR SELECT USING (true);
CREATE POLICY "quizzes_read" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "lesson_progress_own" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "mastery_scores_own" ON public.mastery_scores FOR ALL USING (auth.uid() = user_id);

-- ─── Phase E: Trade Journal ───

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}',
  self_rating INTEGER CHECK (self_rating IS NULL OR (self_rating >= 1 AND self_rating <= 5)),
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_user ON public.journal_entries(user_id);
CREATE INDEX idx_journal_order ON public.journal_entries(related_order_id);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_own" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);

-- ─── Phase F: Challenges & Achievements ───

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  xp_reward INTEGER DEFAULT 100,
  difficulty TEXT DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.challenge_progress (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress_json JSONB NOT NULL DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT DEFAULT 'common'
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  criteria_json JSONB NOT NULL DEFAULT '{}',
  xp_reward INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_read" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenge_progress_own" ON public.challenge_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "achievements_read" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "user_achievements_own" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- ─── Phase G: AI Mentor ───

CREATE TABLE IF NOT EXISTS public.ai_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  context_type TEXT,
  context_id UUID,
  mode TEXT DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  insight_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prompt_templates (
  name TEXT PRIMARY KEY,
  version INTEGER DEFAULT 1,
  template TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_threads_own" ON public.ai_threads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ai_messages_own" ON public.ai_messages FOR ALL
  USING (thread_id IN (SELECT id FROM public.ai_threads WHERE user_id = auth.uid()));
CREATE POLICY "ai_insights_own" ON public.ai_insights FOR ALL USING (auth.uid() = user_id);

-- ─── Phase H: Corporate Actions ───

CREATE TABLE IF NOT EXISTS public.corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('split', 'dividend', 'spinoff')),
  ex_date DATE NOT NULL,
  ratio NUMERIC,
  amount NUMERIC,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corp_actions_symbol ON public.corporate_actions(symbol);
CREATE INDEX idx_corp_actions_unprocessed ON public.corporate_actions(processed) WHERE processed = FALSE;

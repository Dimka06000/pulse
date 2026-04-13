CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'warmup' CHECK (type IN ('warmup', 'cooldown', 'prehab', 'mobility', 'core', 'activation')),
  exercises jsonb NOT NULL DEFAULT '{"exercises": []}',
  duration_minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_routines_coach ON public.routines(coach_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages own routines" ON public.routines FOR ALL USING (
  auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id)
);

NOTIFY pgrst, 'reload schema';

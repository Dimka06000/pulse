CREATE TABLE IF NOT EXISTS public.cycle_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  last_period_date date NOT NULL,
  avg_cycle_days integer NOT NULL DEFAULT 28,
  avg_period_days integer NOT NULL DEFAULT 5,
  consent_given_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cycle_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own cycle data" ON public.cycle_tracking FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

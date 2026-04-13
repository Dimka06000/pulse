CREATE TABLE IF NOT EXISTS public.program_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('before_session', 'every_nth_week', 'tsb_threshold', 'cycle_phase', 'after_race', 'always')),
  condition jsonb NOT NULL DEFAULT '{}',
  action jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_rules_program ON public.program_rules(program_id);
ALTER TABLE public.program_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages rules via program" ON public.program_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';

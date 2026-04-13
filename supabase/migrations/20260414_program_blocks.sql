CREATE TABLE IF NOT EXISTS public.program_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  phase text NOT NULL DEFAULT 'base' CHECK (phase IN ('base', 'build', 'peak', 'taper', 'race', 'recovery')),
  focus text NOT NULL DEFAULT 'general' CHECK (focus IN ('hypertrophy', 'strength', 'endurance', 'power', 'recovery', 'general')),
  week_start integer NOT NULL,
  week_end integer NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  progression_curve jsonb NOT NULL DEFAULT '[100]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_blocks_program ON public.program_blocks(program_id);
ALTER TABLE public.program_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages blocks via program" ON public.program_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';

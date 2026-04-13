CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  sport text NOT NULL,
  category text NOT NULL DEFAULT 'compound' CHECK (category IN ('compound', 'isolation', 'cardio', 'flexibility')),
  muscle_engagement jsonb NOT NULL DEFAULT '{}',
  tendon_stress jsonb NOT NULL DEFAULT '{}',
  joint_impact jsonb NOT NULL DEFAULT '{}',
  default_duration integer,
  default_rpe integer,
  is_custom boolean NOT NULL DEFAULT false,
  coach_id uuid REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exercises_sport ON public.exercises(sport);
CREATE INDEX idx_exercises_coach ON public.exercises(coach_id) WHERE coach_id IS NOT NULL;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads global exercises" ON public.exercises FOR SELECT USING (is_custom = false);
CREATE POLICY "Coach reads own exercises" ON public.exercises FOR SELECT USING (auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id));
CREATE POLICY "Coach manages own exercises" ON public.exercises FOR ALL USING (auth.uid() = (SELECT user_id FROM coach_profiles WHERE id = coach_id));

NOTIFY pgrst, 'reload schema';

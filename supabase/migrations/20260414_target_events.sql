CREATE TABLE IF NOT EXISTS public.target_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.training_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_date date,
  sport text,
  location text,
  distance_km numeric,
  elevation_m integer,
  terrain_type text CHECK (terrain_type IN ('road', 'trail', 'mixed', 'indoor', 'water')),
  scraped_data jsonb NOT NULL DEFAULT '{}',
  source_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.target_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coach manages events via program" ON public.target_events FOR ALL USING (
  program_id IS NULL OR EXISTS (SELECT 1 FROM training_programs tp JOIN coach_profiles cp ON tp.coach_id = cp.id WHERE tp.id = program_id AND cp.user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';

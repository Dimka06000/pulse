ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.program_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS session_template_id uuid REFERENCES public.session_templates(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS routine_warmup_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS routine_cooldown_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;
ALTER TABLE public.program_workouts ADD COLUMN IF NOT EXISTS intensity_percent integer DEFAULT 100;

ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS target_event_id uuid REFERENCES public.target_events(id) ON DELETE SET NULL;
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES auth.users ON DELETE SET NULL;
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS periodization_type text DEFAULT 'custom' CHECK (periodization_type IN ('linear', 'undulating', 'block', 'custom'));
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS pro_mode boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';

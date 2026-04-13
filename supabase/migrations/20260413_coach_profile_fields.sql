-- Add new profile fields for the coach profile wizard
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS display_name text DEFAULT '';
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0;
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS main_sports text[] DEFAULT '{}';
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS instagram text DEFAULT '';
ALTER TABLE public.coach_profiles ADD COLUMN IF NOT EXISTS website text DEFAULT '';

NOTIFY pgrst, 'reload schema';

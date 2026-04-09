-- 016: Training courses, enrollments, coach pathway
create table if not exists public.training_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null check (category in ('platform_basics', 'first_aid', 'sports_nutrition', 'pedagogy', 'partner_cert')),
  duration_minutes integer not null default 60,
  modules jsonb not null default '[]',
  required_for_verification boolean not null default false,
  badge_icon text not null default '🎓',
  created_at timestamptz default now()
);

create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.training_courses(id),
  coach_id uuid not null references public.coach_profiles(id),
  status text not null default 'available' check (status in ('available', 'in_progress', 'completed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  completed_modules jsonb not null default '[]',
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (course_id, coach_id)
);

create table if not exists public.coach_pathway_progress (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) unique,
  profile_complete boolean not null default false,
  basics_course_done boolean not null default false,
  endorsements_count integer not null default 0,
  completed_sessions integer not null default 0,
  is_verified boolean not null default false,
  updated_at timestamptz default now()
);

create index idx_training_enrollments_coach on public.training_enrollments(coach_id);
create index idx_pathway_coach on public.coach_pathway_progress(coach_id);

-- Seed platform basics course (required for verification)
insert into public.training_courses (title, description, category, duration_minutes, modules, required_for_verification, badge_icon)
values (
  'Les bases de la plateforme',
  'Apprenez à utiliser la plateforme : créer vos séances, gérer vos clients, suivre vos revenus.',
  'platform_basics',
  30,
  '[
    {"id": "mod-1", "title": "Bienvenue", "type": "text", "durationMinutes": 5},
    {"id": "mod-2", "title": "Créer votre première séance", "type": "text", "durationMinutes": 10},
    {"id": "mod-3", "title": "Gérer vos clients", "type": "text", "durationMinutes": 10},
    {"id": "mod-4", "title": "Quiz final", "type": "quiz", "durationMinutes": 5, "quizQuestions": [
      {"question": "Comment créer une séance ?", "options": ["Menu Séances > Nouvelle", "Menu Profil > Séances", "Page d accueil > Créer"], "correctIndex": 0},
      {"question": "Où voir vos revenus ?", "options": ["Profil", "Revenus", "Séances"], "correctIndex": 1}
    ]}
  ]'::jsonb,
  true,
  '📚'
),
(
  'Premiers secours sportifs',
  'Les gestes essentiels de premiers secours en contexte sportif.',
  'first_aid',
  60,
  '[
    {"id": "mod-fa-1", "title": "Introduction", "type": "text", "durationMinutes": 10},
    {"id": "mod-fa-2", "title": "Blessures courantes", "type": "text", "durationMinutes": 20},
    {"id": "mod-fa-3", "title": "Réagir face à une urgence", "type": "text", "durationMinutes": 20},
    {"id": "mod-fa-4", "title": "Quiz", "type": "quiz", "durationMinutes": 10}
  ]'::jsonb,
  false,
  '🩹'
),
(
  'Nutrition sportive de base',
  'Comprendre les macronutriments, l hydratation et la récupération.',
  'sports_nutrition',
  45,
  '[
    {"id": "mod-sn-1", "title": "Macronutriments", "type": "text", "durationMinutes": 15},
    {"id": "mod-sn-2", "title": "Hydratation", "type": "text", "durationMinutes": 15},
    {"id": "mod-sn-3", "title": "Quiz", "type": "quiz", "durationMinutes": 15}
  ]'::jsonb,
  false,
  '🥗'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger coach_pathway_updated_at
  before update on public.coach_pathway_progress
  for each row execute function public.set_updated_at();

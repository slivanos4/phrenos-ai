-- AI visibility (admin): where Phrenos.ai appears when someone asks an AI assistant a question a customer would ask.
-- Copied from the Hospitality Nerd design, for a single subject. Server writes via service role only.

create table if not exists public.phrenos_visibility_settings (
  id smallint primary key default 1 check (id = 1),
  names text[] not null default '{}',
  competitors text[] not null default '{}',
  competitor_notes jsonb not null default '{}'::jsonb,
  website text,
  advice jsonb,
  advice_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.phrenos_visibility_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.phrenos_visibility_checks (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.phrenos_visibility_questions (id) on delete cascade,
  engine text not null check (engine in ('claude', 'chatgpt')),
  mentioned boolean not null default false,
  cited boolean not null default false,
  cited_urls jsonb not null default '[]'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  identity text check (identity in ('correct', 'confused', 'unclear')),
  identity_note text,
  excerpt text,
  error text,
  checked_at timestamptz not null default now()
);
create index if not exists phrenos_visibility_checks_question_idx on public.phrenos_visibility_checks (question_id, engine, checked_at desc);
create index if not exists phrenos_visibility_checks_time_idx on public.phrenos_visibility_checks (checked_at desc);

alter table public.phrenos_visibility_settings enable row level security;
alter table public.phrenos_visibility_questions enable row level security;
alter table public.phrenos_visibility_checks enable row level security;
revoke all on public.phrenos_visibility_settings from anon, authenticated;
revoke all on public.phrenos_visibility_questions from anon, authenticated;
revoke all on public.phrenos_visibility_checks from anon, authenticated;

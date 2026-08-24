-- Weekly desk briefs from the Cursor "Weekly genai post ideas" automation.
-- Complements research; never published directly to the public site.

do $$ begin
  create type public.phrenos_brief_status as enum (
    'received',
    'verified',
    'needs_review',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.phrenos_weekly_briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  lookback_start date,
  lookback_end date,
  research_markdown text not null default '',
  content_markdown text not null default '',
  ideas jsonb not null default '[]'::jsonb,
  source_urls text[] not null default array[]::text[],
  status public.phrenos_brief_status not null default 'received',
  verification_notes text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists phrenos_weekly_briefs_created_at_idx
  on public.phrenos_weekly_briefs (created_at desc);

create index if not exists phrenos_weekly_briefs_lookback_idx
  on public.phrenos_weekly_briefs (lookback_start, lookback_end);

create index if not exists phrenos_weekly_briefs_status_idx
  on public.phrenos_weekly_briefs (status, created_at desc);

drop trigger if exists phrenos_weekly_briefs_updated_at on public.phrenos_weekly_briefs;
create trigger phrenos_weekly_briefs_updated_at
  before update on public.phrenos_weekly_briefs
  for each row execute function public.phrenos_set_updated_at();

alter table public.phrenos_weekly_briefs enable row level security;

revoke all on public.phrenos_weekly_briefs from anon, authenticated;

comment on table public.phrenos_weekly_briefs is
  'Cursor weekly GenAI desk briefs that seed Phrenos research (admin only)';

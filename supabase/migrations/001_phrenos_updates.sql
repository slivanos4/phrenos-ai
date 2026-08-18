-- Phrenos.ai weekly Gen AI news pipeline
-- Research runs, stories, sources, content suggestions, and published posts.
--
-- Access model for the MVP: server side only through the Supabase service role key,
-- which bypasses RLS. RLS is enabled with no permissive policies so anon and
-- authenticated keys cannot read or write these tables. Add policies later if the
-- marketing site ever needs to read published posts with the anon key.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.phrenos_run_status as enum ('pending', 'running', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.phrenos_research_section as enum ('models_research', 'products_industry');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.phrenos_suggestion_type as enum ('blog', 'linkedin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.phrenos_suggestion_status as enum ('draft', 'approved', 'rejected', 'published');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Research runs (one batch per weekly lookback window)
-- ---------------------------------------------------------------------------

create table if not exists public.phrenos_research_runs (
  id uuid primary key default gen_random_uuid(),
  status public.phrenos_run_status not null default 'pending',
  trigger_type text not null default 'manual',
  lookback_start date,
  lookback_end date,
  error_message text,
  retry_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists phrenos_research_runs_created_at_idx
  on public.phrenos_research_runs (created_at desc);

create index if not exists phrenos_research_runs_lookback_idx
  on public.phrenos_research_runs (lookback_start, lookback_end);

-- ---------------------------------------------------------------------------
-- Stories: 3 models_research + 3 products_industry per run
-- ---------------------------------------------------------------------------

create table if not exists public.phrenos_research_stories (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.phrenos_research_runs (id) on delete cascade,
  section public.phrenos_research_section not null,
  title text not null,
  summary_html text not null default '',
  topic_tags text[] not null default array[]::text[],
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists phrenos_research_stories_run_id_idx
  on public.phrenos_research_stories (run_id, sort_order);

-- ---------------------------------------------------------------------------
-- Sources with Firecrawl fact bullets and resolved publish dates
-- ---------------------------------------------------------------------------

create table if not exists public.phrenos_research_sources (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.phrenos_research_stories (id) on delete cascade,
  url text not null default '',
  title text not null default '',
  accessed_at timestamptz not null default now(),
  published_at date,
  snapshot_excerpt text,
  extracted_facts text,
  is_synthesis boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists phrenos_research_sources_story_id_idx
  on public.phrenos_research_sources (story_id, sort_order);

-- ---------------------------------------------------------------------------
-- Content suggestions: 4 blog ideas, 4 LinkedIn ideas, 1 featured blog, 1 featured LinkedIn
-- ---------------------------------------------------------------------------

create table if not exists public.phrenos_content_suggestions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.phrenos_research_stories (id) on delete cascade,
  suggestion_type public.phrenos_suggestion_type not null,
  status public.phrenos_suggestion_status not null default 'draft',
  title text not null default '',
  hook text not null default '',
  body_html text not null default '',
  cta text not null default '',
  hashtags text not null default '',
  image_ideas text not null default '',
  is_full_draft boolean not null default false,
  sort_order integer not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists phrenos_content_suggestions_story_id_idx
  on public.phrenos_content_suggestions (story_id, sort_order);

create index if not exists phrenos_content_suggestions_status_idx
  on public.phrenos_content_suggestions (status, is_full_draft);

-- ---------------------------------------------------------------------------
-- Published posts for phrenosai.com/ai-updates (approved featured blogs only)
-- ---------------------------------------------------------------------------

create table if not exists public.phrenos_published_posts (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid references public.phrenos_content_suggestions (id) on delete set null,
  story_id uuid references public.phrenos_research_stories (id) on delete set null,
  title text not null,
  slug text not null unique,
  hook text not null default '',
  summary_html text not null default '',
  body_html text not null default '',
  cta text not null default '',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists phrenos_published_posts_suggestion_id_key
  on public.phrenos_published_posts (suggestion_id)
  where suggestion_id is not null;

create index if not exists phrenos_published_posts_published_at_idx
  on public.phrenos_published_posts (published_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.phrenos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists phrenos_research_stories_updated_at on public.phrenos_research_stories;
create trigger phrenos_research_stories_updated_at
  before update on public.phrenos_research_stories
  for each row execute function public.phrenos_set_updated_at();

drop trigger if exists phrenos_content_suggestions_updated_at on public.phrenos_content_suggestions;
create trigger phrenos_content_suggestions_updated_at
  before update on public.phrenos_content_suggestions
  for each row execute function public.phrenos_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: service role only (no policies means anon and authenticated are denied)
-- ---------------------------------------------------------------------------

alter table public.phrenos_research_runs enable row level security;
alter table public.phrenos_research_stories enable row level security;
alter table public.phrenos_research_sources enable row level security;
alter table public.phrenos_content_suggestions enable row level security;
alter table public.phrenos_published_posts enable row level security;

revoke all on public.phrenos_research_runs from anon, authenticated;
revoke all on public.phrenos_research_stories from anon, authenticated;
revoke all on public.phrenos_research_sources from anon, authenticated;
revoke all on public.phrenos_content_suggestions from anon, authenticated;
revoke all on public.phrenos_published_posts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retention: drop research batches older than 6 months (children cascade)
-- ---------------------------------------------------------------------------

create or replace function public.purge_old_phrenos_research()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.phrenos_research_runs
  where created_at < now() - interval '6 months';
end;
$$;

comment on table public.phrenos_research_runs is 'Weekly Phrenos.ai Gen AI research runs (service role access only)';
comment on table public.phrenos_research_stories is '3 models_research + 3 products_industry stories per run';
comment on table public.phrenos_research_sources is 'Verified article sources with Firecrawl extracted_facts';
comment on table public.phrenos_content_suggestions is 'Blog and LinkedIn ideas plus featured full drafts';
comment on table public.phrenos_published_posts is 'Approved featured blogs live on phrenosai.com/ai-updates';

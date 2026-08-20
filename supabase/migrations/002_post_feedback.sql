-- Post usefulness feedback (thumbs up / down) on published AI updates.
-- Server writes via service role only; public site posts through an API route.

do $$ begin
  create type public.phrenos_post_reaction as enum ('up', 'down');
exception when duplicate_object then null;
end $$;

create table if not exists public.phrenos_post_feedback (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.phrenos_published_posts (id) on delete cascade,
  reaction public.phrenos_post_reaction not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phrenos_post_feedback_post_visitor_key unique (post_id, visitor_key)
);

create index if not exists phrenos_post_feedback_post_id_idx
  on public.phrenos_post_feedback (post_id, reaction);

drop trigger if exists phrenos_post_feedback_updated_at on public.phrenos_post_feedback;
create trigger phrenos_post_feedback_updated_at
  before update on public.phrenos_post_feedback
  for each row execute function public.phrenos_set_updated_at();

alter table public.phrenos_post_feedback enable row level security;

revoke all on public.phrenos_post_feedback from anon, authenticated;

comment on table public.phrenos_post_feedback is 'Anonymous thumbs up/down on published AI updates';

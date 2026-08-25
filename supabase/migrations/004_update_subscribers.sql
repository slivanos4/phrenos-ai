-- Email subscribers for new AI Updates articles.
-- Server writes via service role only; public site posts through an API route.

do $$ begin
  create type public.phrenos_subscriber_status as enum (
    'active',
    'unsubscribed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.phrenos_update_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  status public.phrenos_subscriber_status not null default 'active',
  source text not null default 'ai-updates',
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  constraint phrenos_update_subscribers_email_normalized_key unique (email_normalized)
);

create index if not exists phrenos_update_subscribers_status_idx
  on public.phrenos_update_subscribers (status, created_at desc);

create index if not exists phrenos_update_subscribers_token_idx
  on public.phrenos_update_subscribers (unsubscribe_token);

drop trigger if exists phrenos_update_subscribers_updated_at on public.phrenos_update_subscribers;
create trigger phrenos_update_subscribers_updated_at
  before update on public.phrenos_update_subscribers
  for each row execute function public.phrenos_set_updated_at();

alter table public.phrenos_update_subscribers enable row level security;

revoke all on public.phrenos_update_subscribers from anon, authenticated;

comment on table public.phrenos_update_subscribers is
  'Readers who opted in for emails when a new AI Updates article is published';

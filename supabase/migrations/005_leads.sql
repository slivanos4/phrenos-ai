-- Enquiries and sign-ups from the website: contact form, AI readiness check and cheat sheet.
-- Server writes via service role only (API routes); the browser never talks to this table.

create table if not exists public.phrenos_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null,
  email text not null,
  email_normalized text not null,
  name text,
  organisation text,
  role text,
  message text,
  readiness_percent integer,
  readiness_tier text,
  details jsonb not null default '{}'::jsonb,
  newsletter_opt_in boolean not null default false,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'in_progress', 'won', 'not_a_fit')),
  notes text
);

create index if not exists phrenos_leads_created_idx
  on public.phrenos_leads (created_at desc);

create index if not exists phrenos_leads_email_idx
  on public.phrenos_leads (email_normalized);

create index if not exists phrenos_leads_status_idx
  on public.phrenos_leads (status, created_at desc);

drop trigger if exists phrenos_leads_updated_at on public.phrenos_leads;
create trigger phrenos_leads_updated_at
  before update on public.phrenos_leads
  for each row execute function public.phrenos_set_updated_at();

alter table public.phrenos_leads enable row level security;

revoke all on public.phrenos_leads from anon, authenticated;

comment on table public.phrenos_leads is
  'Website leads (contact, readiness check, cheat sheet). Service role only.';

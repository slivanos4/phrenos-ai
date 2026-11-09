-- Market Desk: daily Pulse per asset, saved dashboards, and read-only API tokens.

-- One short, sourced summary per asset per day.
create table if not exists public.phrenos_market_pulses (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null,
  day date not null,
  headline text not null default '',
  bullets jsonb not null default '[]'::jsonb,
  move jsonb,
  created_at timestamptz not null default now(),
  unique (asset_key, day)
);
create index if not exists phrenos_market_pulses_asset_idx on public.phrenos_market_pulses (asset_key, day desc);
create index if not exists phrenos_market_pulses_day_idx on public.phrenos_market_pulses (day desc);

-- Saved dashboard layouts: a name and an ordered list of widgets.
create table if not exists public.phrenos_market_dashboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  widgets jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Read-only API tokens. Only a hash of each token is stored, so a token cannot be read back after it is made.
create table if not exists public.phrenos_market_api_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  prefix text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.phrenos_market_pulses enable row level security;
alter table public.phrenos_market_dashboards enable row level security;
alter table public.phrenos_market_api_tokens enable row level security;
revoke all on public.phrenos_market_pulses from anon, authenticated;
revoke all on public.phrenos_market_dashboards from anon, authenticated;
revoke all on public.phrenos_market_api_tokens from anon, authenticated;

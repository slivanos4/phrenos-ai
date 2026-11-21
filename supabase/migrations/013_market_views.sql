-- Market Desk: the refreshable research view and outlook text for each asset.
create table if not exists public.phrenos_market_views (
  asset_key text primary key,
  note text not null default '',
  outlook_text text not null default '',
  state text not null default 'unknown',
  odds jsonb,
  news jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.phrenos_market_views enable row level security;
revoke all on public.phrenos_market_views from anon, authenticated;

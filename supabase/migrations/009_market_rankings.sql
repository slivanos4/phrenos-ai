-- Market Desk research rankings: one row per scanned asset, ordered by an evidence score.
create table if not exists public.phrenos_market_rankings (
  key text primary key,
  rank integer not null,
  score integer not null,
  view text not null,
  name text not null,
  symbol text not null,
  asset_type text not null,
  image text,
  currency text not null default 'USD',
  price numeric,
  price_gbp numeric,
  change_1d numeric,
  change_7d numeric,
  change_30d numeric,
  change_90d numeric,
  market_cap_gbp numeric,
  volume_gbp numeric,
  risk_label text,
  risk_score integer,
  vs_sma200 numeric,
  drawdown_1y numeric,
  year_high numeric,
  year_low numeric,
  history jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  concerns jsonb not null default '[]'::jsonb,
  watch_for jsonb not null default '[]'::jsonb,
  note text not null default '',
  note_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists phrenos_market_rankings_rank_idx on public.phrenos_market_rankings (rank);

alter table public.phrenos_market_rankings enable row level security;
revoke all on public.phrenos_market_rankings from anon, authenticated;

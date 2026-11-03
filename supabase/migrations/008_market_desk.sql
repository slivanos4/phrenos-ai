-- Market Desk (admin): holdings, watchlist, cached market metrics, alerts, weekly briefs,
-- announcements, smart-money signals, launches and push subscriptions.
-- Server writes via service role only.

create table if not exists public.phrenos_market_assets (
  key text primary key,                 -- 'yahoo:AAPL' or 'cg:bitcoin'
  provider text not null,
  symbol text not null,
  name text not null default '',
  asset_type text not null,             -- stock | etf | bond | crypto | fx | commodity
  currency text not null default 'USD',
  price numeric,
  price_gbp numeric,
  price_eur numeric,
  change_1d numeric,
  change_7d numeric,
  change_30d numeric,
  change_90d numeric,
  vol_30d numeric,
  vol_90d numeric,
  drawdown_1y numeric,
  sma50 numeric,
  sma200 numeric,
  risk_score integer,
  risk_label text,
  risk_reasons jsonb not null default '[]'::jsonb,
  prev_risk_score integer,
  history jsonb not null default '[]'::jsonb,   -- recent daily closes for sparklines
  updated_at timestamptz not null default now()
);

create table if not exists public.phrenos_market_holdings (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null,
  symbol text not null,
  name text not null default '',
  asset_type text not null,
  quantity numeric not null,
  buy_price numeric not null,
  buy_currency text not null default 'GBP',
  buy_date date,
  high_water numeric,                    -- highest price seen since buying, in the asset's own currency
  status text not null default 'open',   -- open | closed
  sell_price numeric,
  sold_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists phrenos_market_holdings_status_idx on public.phrenos_market_holdings (status);

create table if not exists public.phrenos_market_watchlist (
  asset_key text primary key,
  symbol text not null,
  name text not null default '',
  asset_type text not null,
  added_at timestamptz not null default now()
);

create table if not exists public.phrenos_market_alerts (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid references public.phrenos_market_holdings (id) on delete cascade,
  asset_key text,
  kind text not null,
  severity text not null default 'warning',  -- info | warning | critical
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  emailed_at timestamptz,
  pushed_at timestamptz,
  dismissed_at timestamptz
);
create index if not exists phrenos_market_alerts_created_idx on public.phrenos_market_alerts (created_at desc);

create table if not exists public.phrenos_market_settings (
  id smallint primary key default 1 check (id = 1),
  alert_email text,
  thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.phrenos_market_briefs (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  status text not null default 'draft',
  title text not null default '',
  summary_html text not null default '',
  sections jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.phrenos_market_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                    -- central_bank | economic | crypto_regulation | etf | other
  title text not null,
  summary text not null default '',
  region text not null default '',
  impact text not null default 'medium', -- low | medium | high
  source_url text not null,
  event_date timestamptz,
  created_at timestamptz not null default now(),
  unique (source_url)
);
create index if not exists phrenos_market_events_date_idx on public.phrenos_market_events (event_date desc);

create table if not exists public.phrenos_market_signals (
  id uuid primary key default gen_random_uuid(),
  asset_key text,
  symbol text not null,
  signal_type text not null,             -- whale_transfer | volume_spike | insider_buy | insider_sell | fund_holding | options
  direction text not null default 'neutral', -- bullish | bearish | neutral
  strength integer not null default 1,   -- 1 (weak) to 5 (strong)
  summary text not null,
  data jsonb not null default '{}'::jsonb,
  source_url text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists phrenos_market_signals_observed_idx on public.phrenos_market_signals (observed_at desc);

create table if not exists public.phrenos_market_launches (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                    -- token | ipo | currency
  name text not null,
  symbol text not null default '',
  summary text not null default '',
  risk_flags jsonb not null default '[]'::jsonb,
  risk_level text not null default 'very high',
  source_url text not null,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_url)
);

create table if not exists public.phrenos_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.phrenos_market_assets enable row level security;
alter table public.phrenos_market_holdings enable row level security;
alter table public.phrenos_market_watchlist enable row level security;
alter table public.phrenos_market_alerts enable row level security;
alter table public.phrenos_market_settings enable row level security;
alter table public.phrenos_market_briefs enable row level security;
alter table public.phrenos_market_events enable row level security;
alter table public.phrenos_market_signals enable row level security;
alter table public.phrenos_market_launches enable row level security;
alter table public.phrenos_push_subscriptions enable row level security;

revoke all on public.phrenos_market_assets from anon, authenticated;
revoke all on public.phrenos_market_holdings from anon, authenticated;
revoke all on public.phrenos_market_watchlist from anon, authenticated;
revoke all on public.phrenos_market_alerts from anon, authenticated;
revoke all on public.phrenos_market_settings from anon, authenticated;
revoke all on public.phrenos_market_briefs from anon, authenticated;
revoke all on public.phrenos_market_events from anon, authenticated;
revoke all on public.phrenos_market_signals from anon, authenticated;
revoke all on public.phrenos_market_launches from anon, authenticated;
revoke all on public.phrenos_push_subscriptions from anon, authenticated;

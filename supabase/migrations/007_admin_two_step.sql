-- Two-step sign in for /admin: one row holding the (encrypted) authenticator secret and
-- the lockout counters. Written by the server with the service role only.
create table if not exists public.phrenos_admin_security (
  id smallint primary key default 1 check (id = 1),
  totp_secret_enc text,
  enrolled_at timestamptz,
  last_step bigint not null default 0,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.phrenos_admin_security enable row level security;
revoke all on public.phrenos_admin_security from anon, authenticated;

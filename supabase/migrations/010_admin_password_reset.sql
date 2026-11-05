-- Lets the admin reset the sign-in password by email. The new password is stored as a salted hash
-- and takes over from the PHRENOS_ADMIN_PASSWORD setting once it exists.
alter table public.phrenos_admin_security
  add column if not exists password_hash text,
  add column if not exists password_updated_at timestamptz,
  add column if not exists reset_requested_at timestamptz;

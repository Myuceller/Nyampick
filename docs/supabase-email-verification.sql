-- Email verification codes for Nyampick custom signup.
-- Run this in Supabase SQL Editor before enabling production email verification.

create table if not exists public.email_verification_codes (
  email text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_verification_codes enable row level security;

-- Client access is intentionally blocked. Server routes use the service role key.
drop policy if exists "email verification codes are server only" on public.email_verification_codes;

create index if not exists email_verification_codes_expires_at_idx
  on public.email_verification_codes (expires_at);

-- Optional cleanup:
-- delete from public.email_verification_codes
-- where expires_at < now() - interval '1 day';

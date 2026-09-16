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

-- Signup verification abuse protection. Keys are HMAC hashes produced by the
-- server, so no raw IP address or raw email is stored here.
create table if not exists public.email_verification_rate_limits (
  scope text not null check (scope in ('email', 'ip')),
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

alter table public.email_verification_rate_limits enable row level security;

create or replace function public.consume_email_verification_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
  next_window_started_at timestamptz;
begin
  if p_scope not in ('email', 'ip') or p_key_hash = '' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid email verification rate limit input';
  end if;

  insert into public.email_verification_rate_limits as limits (
    scope, key_hash, window_started_at, request_count, updated_at
  ) values (p_scope, p_key_hash, now(), 1, now())
  on conflict (scope, key_hash) do update
  set
    request_count = case
      when limits.window_started_at <= now() - (p_window_seconds * interval '1 second') then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at <= now() - (p_window_seconds * interval '1 second') then now()
      else limits.window_started_at
    end,
    updated_at = now()
  returning request_count, window_started_at into next_count, next_window_started_at;

  return query select
    next_count <= p_limit,
    greatest(
      1,
      ceil(extract(epoch from (next_window_started_at + (p_window_seconds * interval '1 second') - now())))::integer
    );
end;
$$;

revoke all on function public.consume_email_verification_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_email_verification_rate_limit(text, text, integer, integer)
  to service_role;

-- Optional cleanup:
-- delete from public.email_verification_codes
-- where expires_at < now() - interval '1 day';

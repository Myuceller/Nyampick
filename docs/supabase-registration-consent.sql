-- Registration consent + RLS hardening migration for existing Nyampick projects.
-- Apply this in Supabase SQL Editor BEFORE deploying the corresponding server code.
-- It intentionally does not backfill consent for existing accounts: historical
-- consent must not be fabricated. Existing accounts keep access only through a
-- profile whose id exactly matches their authenticated auth.users id.

create table if not exists public.user_registration_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_terms_version text not null,
  privacy_policy_version text not null,
  age_over_14_confirmed boolean not null,
  marketing_accepted boolean not null default false,
  source text not null check (source in ('email', 'oauth')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, service_terms_version, privacy_policy_version)
);

alter table public.user_registration_consents enable row level security;

-- No client policy is created. Server routes use the Supabase service role,
-- which bypasses RLS; browser and native clients must use Nyampick's API.

create index if not exists user_registration_consents_accepted_at_idx
  on public.user_registration_consents (accepted_at desc);

-- A signup attempt is created before the browser or native app starts OAuth.
-- The opaque UUID is passed through the callback, but consent booleans never
-- appear in URLs. Service-role API routes bind it to exactly one auth user.
create table if not exists public.oauth_registration_attempts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google', 'kakao', 'apple')),
  service_terms_accepted boolean not null check (service_terms_accepted),
  privacy_policy_accepted boolean not null check (privacy_policy_accepted),
  age_over_14_confirmed boolean not null check (age_over_14_confirmed),
  marketing_accepted boolean not null default false,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  claimed_user_id uuid references auth.users(id) on delete cascade,
  claimed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((claimed_user_id is null) = (claimed_at is null))
);

alter table public.oauth_registration_attempts enable row level security;

-- Existing projects retain the original generated check constraint after
-- CREATE TABLE IF NOT EXISTS, so widen it explicitly for native Apple signup.
alter table public.oauth_registration_attempts
  drop constraint if exists oauth_registration_attempts_provider_check;
alter table public.oauth_registration_attempts
  add constraint oauth_registration_attempts_provider_check
  check (provider in ('google', 'kakao', 'apple'));

create index if not exists oauth_registration_attempts_expires_at_idx
  on public.oauth_registration_attempts (expires_at);

-- Existing "service-role-all" policies were previously created without a role
-- qualifier. Restrict them so anonymous/authenticated API roles cannot read or
-- mutate app data directly through PostgREST.
drop policy if exists "service-role-all" on public.meal_entries;
create policy "service-role-all"
on public.meal_entries
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.fridge_items;
create policy "service-role-all"
on public.fridge_items
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.user_profile;
create policy "service-role-all"
on public.user_profile
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.saved_recipes;
create policy "service-role-all"
on public.saved_recipes
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.child_profiles;
create policy "service-role-all"
on public.child_profiles
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.child_invite_codes;
create policy "service-role-all"
on public.child_invite_codes
for all
to service_role
using (true)
with check (true);

drop policy if exists "service-role-all" on public.family_access_links;
create policy "service-role-all"
on public.family_access_links
for all
to service_role
using (true)
with check (true);

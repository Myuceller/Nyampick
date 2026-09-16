-- Run this in Supabase SQL Editor
-- This file is schema/migration only.
-- Do NOT delete all data here. Use docs/reset-user-data.sql for user-level reset.

-- Optional cleanup of obsolete sharing tables (legacy shared-link flow)
drop table if exists public.meal_share_tokens cascade;
drop table if exists public.family_members cascade;

-- Core tables
create table if not exists public.meal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  menu_name text not null,
  quantity text,
  memo text,
  reaction text check (reaction in ('loved', 'okay', 'disliked') or reaction is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fridge_items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('fruit','vegetable','protein','dairy','grain','sauce','snack','other')),
  quantity text,
  expires_at text,
  added_at timestamptz not null default now(),
  source text not null check (source in ('manual','receipt'))
);

-- Receipt OCR candidates are private, short-lived, and consumed by one atomic
-- confirm operation. This must not be replaced with process memory in a
-- serverless deployment.
create table if not exists public.receipt_scan_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  candidates jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  confirmation_result jsonb
);

create index if not exists receipt_scan_sessions_user_expires_idx
on public.receipt_scan_sessions(user_id, expires_at);

create or replace function public.confirm_receipt_scan_session(
  p_scan_id uuid,
  p_user_id uuid,
  p_storage_user_id uuid,
  p_selected jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_candidates jsonb;
  inserted_items jsonb;
begin
  select candidates into session_candidates
  from public.receipt_scan_sessions
  where id = p_scan_id
    and user_id = p_user_id
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    if exists (
      select 1 from public.receipt_scan_sessions
      where id = p_scan_id and user_id = p_user_id and consumed_at is not null
    ) then
      return jsonb_build_object('status', 'already_confirmed');
    end if;
    if exists (
      select 1 from public.receipt_scan_sessions
      where id = p_scan_id and user_id = p_user_id and expires_at <= now()
    ) then
      return jsonb_build_object('status', 'expired');
    end if;
    return jsonb_build_object('status', 'not_found');
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(session_candidates) as candidate(value)
    join jsonb_array_elements(p_selected) as selection(value)
      on candidate.value->>'tempId' = selection.value->>'tempId'
  ) then
    return jsonb_build_object('status', 'invalid_selection');
  end if;

  update public.receipt_scan_sessions
  set consumed_at = now()
  where id = p_scan_id and user_id = p_user_id;

  with selected as (
    select distinct on (value->>'tempId') value
    from jsonb_array_elements(p_selected)
    order by value->>'tempId'
  ), matched as (
    select candidate.value as candidate, selected.value as selection
    from jsonb_array_elements(session_candidates) as candidate(value)
    join selected on candidate.value->>'tempId' = selected.value->>'tempId'
  ), inserted as (
    insert into public.fridge_items (
      id, user_id, name, category, quantity, expires_at, source
    )
    select
      gen_random_uuid()::text,
      p_storage_user_id,
      coalesce(nullif(trim(selection->>'name'), ''), candidate->>'name'),
      case
        when selection->>'category' in ('fruit','vegetable','protein','dairy','grain','sauce','snack','other')
          then selection->>'category'
        else candidate->>'category'
      end,
      nullif(trim(selection->>'quantity'), ''),
      nullif(trim(selection->>'expiresAt'), ''),
      'receipt'
    from matched
    returning id, name, category, quantity, expires_at, added_at, source
  )
  select jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'category', category,
    'quantity', quantity,
    'expiresAt', expires_at,
    'addedAt', added_at,
    'source', source
  )) into inserted_items
  from inserted;

  inserted_items := coalesce(inserted_items, '[]'::jsonb);
  update public.receipt_scan_sessions
  set confirmation_result = inserted_items
  where id = p_scan_id and user_id = p_user_id;

  return jsonb_build_object('status', 'confirmed', 'items', inserted_items);
end;
$$;

revoke all on function public.confirm_receipt_scan_session(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.confirm_receipt_scan_session(uuid, uuid, uuid, jsonb) to service_role;

create table if not exists public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  baby_name text not null,
  baby_months_old int not null default 0,
  email text,
  profile_image_url text
);

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

create table if not exists public.saved_recipes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  taste text check (taste in ('좋아해요','보통이에요','싫어해요') or taste is null),
  source text not null check (source in ('ai','manual')),
  favorite boolean not null default false,
  link text,
  memo text,
  recipe_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing projects need this additive migration before the recipe API update.
-- Run this file (or this statement) in the Supabase SQL editor before deploying
-- the matching API/app code.
alter table public.saved_recipes add column if not exists recipe_data jsonb;

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  months_old int not null default 0,
  photo_url text,
  allergies text[] not null default '{}',
  baby_food_started_on date,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.child_invite_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.family_access_links (
  id uuid primary key default gen_random_uuid(),
  guest_user_id uuid not null unique references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references public.child_profiles(id) on delete cascade,
  code_id uuid not null references public.child_invite_codes(id) on delete cascade,
  relationship_label text not null default '가족 구성원',
  linked_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Migration safety for already-created tables
alter table public.meal_entries add column if not exists user_id uuid;
alter table public.meal_entries add column if not exists child_id uuid;
alter table public.fridge_items add column if not exists user_id uuid;
alter table public.saved_recipes add column if not exists user_id uuid;
alter table public.user_profile add column if not exists profile_image_url text;
alter table public.child_profiles add column if not exists photo_url text;
alter table public.child_profiles add column if not exists allergies text[] not null default '{}';
alter table public.child_profiles add column if not exists baby_food_started_on date;
alter table public.family_access_links add column if not exists relationship_label text not null default '가족 구성원';

-- Indexes
create index if not exists meal_entries_user_id_idx on public.meal_entries(user_id);
create index if not exists meal_entries_user_id_date_idx on public.meal_entries(user_id, date desc);
create index if not exists meal_entries_child_id_idx on public.meal_entries(child_id);
create index if not exists meal_entries_date_idx on public.meal_entries(date);
create index if not exists meal_entries_meal_type_idx on public.meal_entries(meal_type);

create index if not exists fridge_items_user_id_idx on public.fridge_items(user_id);
create index if not exists fridge_items_added_at_idx on public.fridge_items(added_at desc);
create index if not exists fridge_items_category_idx on public.fridge_items(category);

create index if not exists saved_recipes_user_id_idx on public.saved_recipes(user_id);
create index if not exists saved_recipes_created_at_idx on public.saved_recipes(created_at desc);
create index if not exists child_profiles_user_id_idx on public.child_profiles(user_id);
create unique index if not exists child_profiles_one_primary_per_user_idx
  on public.child_profiles(user_id)
  where is_primary = true;
create index if not exists child_invite_codes_owner_user_id_idx on public.child_invite_codes(owner_user_id);
create index if not exists child_invite_codes_child_id_idx on public.child_invite_codes(child_id);
create index if not exists child_invite_codes_code_idx on public.child_invite_codes(code);

create table if not exists public.family_invite_join_attempts (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_family_invite_join_attempt(p_key_hash text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare next_count integer; window_started timestamptz;
begin
  if p_key_hash = '' then raise exception 'invalid family invite rate limit key'; end if;
  insert into public.family_invite_join_attempts as attempts (key_hash, window_started_at, attempt_count, updated_at)
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update set
    attempt_count = case when attempts.window_started_at <= now() - interval '10 minutes' then 1 else attempts.attempt_count + 1 end,
    window_started_at = case when attempts.window_started_at <= now() - interval '10 minutes' then now() else attempts.window_started_at end,
    updated_at = now()
  returning attempt_count, window_started_at into next_count, window_started;
  return query select next_count <= 5, greatest(1, ceil(extract(epoch from (window_started + interval '10 minutes' - now())))::integer);
end;
$$;
revoke all on function public.consume_family_invite_join_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_family_invite_join_attempt(text) to service_role;
create index if not exists family_access_links_guest_user_id_idx on public.family_access_links(guest_user_id);
create index if not exists family_access_links_owner_user_id_idx on public.family_access_links(owner_user_id);
create index if not exists family_access_links_child_id_idx on public.family_access_links(child_id);
create index if not exists user_registration_consents_accepted_at_idx
  on public.user_registration_consents(accepted_at desc);

-- Not-null constraints after migration column creation
alter table public.meal_entries alter column user_id set not null;
alter table public.fridge_items alter column user_id set not null;
alter table public.saved_recipes alter column user_id set not null;
alter table public.child_profiles alter column user_id set not null;
alter table public.child_invite_codes alter column owner_user_id set not null;
alter table public.child_invite_codes alter column child_id drop not null;
alter table public.family_access_links alter column guest_user_id set not null;
alter table public.family_access_links alter column owner_user_id set not null;
alter table public.family_access_links alter column child_id drop not null;
alter table public.family_access_links alter column code_id set not null;

-- Enable RLS
alter table public.meal_entries enable row level security;
alter table public.fridge_items enable row level security;
alter table public.receipt_scan_sessions enable row level security;
alter table public.user_profile enable row level security;
alter table public.saved_recipes enable row level security;
alter table public.child_profiles enable row level security;
alter table public.child_invite_codes enable row level security;
alter table public.family_access_links enable row level security;
alter table public.family_invite_join_attempts enable row level security;
alter table public.user_registration_consents enable row level security;

-- Server-side service-role policy (current app uses service-role on API server)
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

drop policy if exists "service-role-all" on public.receipt_scan_sessions;
create policy "service-role-all"
on public.receipt_scan_sessions
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

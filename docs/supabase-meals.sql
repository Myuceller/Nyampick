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

create table if not exists public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  baby_name text not null,
  baby_months_old int not null default 0,
  email text,
  profile_image_url text
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
create index if not exists family_access_links_guest_user_id_idx on public.family_access_links(guest_user_id);
create index if not exists family_access_links_owner_user_id_idx on public.family_access_links(owner_user_id);
create index if not exists family_access_links_child_id_idx on public.family_access_links(child_id);

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
alter table public.user_profile enable row level security;
alter table public.saved_recipes enable row level security;
alter table public.child_profiles enable row level security;
alter table public.child_invite_codes enable row level security;
alter table public.family_access_links enable row level security;

-- Server-side service-role policy (current app uses service-role on API server)
drop policy if exists "service-role-all" on public.meal_entries;
create policy "service-role-all"
on public.meal_entries
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.fridge_items;
create policy "service-role-all"
on public.fridge_items
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.user_profile;
create policy "service-role-all"
on public.user_profile
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.saved_recipes;
create policy "service-role-all"
on public.saved_recipes
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.child_profiles;
create policy "service-role-all"
on public.child_profiles
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.child_invite_codes;
create policy "service-role-all"
on public.child_invite_codes
for all
using (true)
with check (true);

drop policy if exists "service-role-all" on public.family_access_links;
create policy "service-role-all"
on public.family_access_links
for all
using (true)
with check (true);

-- Run this in Supabase SQL Editor
-- This file is schema/migration only.
-- Do NOT delete all data here. Use docs/reset-user-data.sql for user-level reset.

-- Core tables
create table if not exists public.meal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  email text
);

create table if not exists public.family_members (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('mother','father','grandparent','caregiver')),
  status text not null check (status in ('connected','pending')),
  invited_at timestamptz not null default now()
);

-- Migration safety for already-created tables
alter table public.meal_entries add column if not exists user_id uuid;
alter table public.fridge_items add column if not exists user_id uuid;
alter table public.family_members add column if not exists user_id uuid;

-- Indexes
create index if not exists meal_entries_user_id_idx on public.meal_entries(user_id);
create index if not exists meal_entries_date_idx on public.meal_entries(date);
create index if not exists meal_entries_meal_type_idx on public.meal_entries(meal_type);

create index if not exists fridge_items_user_id_idx on public.fridge_items(user_id);
create index if not exists fridge_items_added_at_idx on public.fridge_items(added_at desc);
create index if not exists fridge_items_category_idx on public.fridge_items(category);

create index if not exists family_members_user_id_idx on public.family_members(user_id);
create index if not exists family_members_invited_at_idx on public.family_members(invited_at desc);

-- Not-null constraints after migration column creation
alter table public.meal_entries alter column user_id set not null;
alter table public.fridge_items alter column user_id set not null;
alter table public.family_members alter column user_id set not null;

-- Enable RLS
alter table public.meal_entries enable row level security;
alter table public.fridge_items enable row level security;
alter table public.user_profile enable row level security;
alter table public.family_members enable row level security;

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

drop policy if exists "service-role-all" on public.family_members;
create policy "service-role-all"
on public.family_members
for all
using (true)
with check (true);

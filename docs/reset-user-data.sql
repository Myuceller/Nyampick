-- Reset data for one specific user only
-- 1) Replace the UUID below.
-- 2) Run in Supabase SQL Editor.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Please replace target_user_id with a real auth.users.id UUID';
  end if;

  delete from public.meal_entries where user_id = target_user_id;
  delete from public.fridge_items where user_id = target_user_id;
  delete from public.family_access_links where guest_user_id = target_user_id or owner_user_id = target_user_id;
  delete from public.child_invite_codes where owner_user_id = target_user_id;
  delete from public.child_profiles where user_id = target_user_id;
  delete from public.saved_recipes where user_id = target_user_id;
  delete from public.user_profile where id = target_user_id;
end
$$;

-- Optional: get UUID by email
-- select id, email from auth.users where email = 'your-email@example.com';

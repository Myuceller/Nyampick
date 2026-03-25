-- Reset data for one specific user only
-- 1) Replace the UUID below.
-- 2) Run in Supabase SQL Editor.

do $$
declare
  target_user_id uuid := '05dacb81-ba8e-4d2c-90f2-2691d0b1656b';
begin
  if target_user_id = '123'::uuid then
    raise exception 'Please replace target_user_id with a real auth.users.id UUID';
  end if;

  delete from public.meal_entries where user_id = target_user_id;
  delete from public.fridge_items where user_id = target_user_id;
  delete from public.family_members where user_id = target_user_id;
  delete from public.user_profile where id = target_user_id;
end
$$;

-- Optional: get UUID by email
-- select id, email from auth.users where email = 'your-email@example.com';

-- Seed dummy data for this user only:
-- 139104d3-f796-4479-a91e-61242bc590bf

begin;

-- Clean current rows for this user first
delete from public.meal_entries
where user_id::text = '139104d3-f796-4479-a91e-61242bc590bf';

delete from public.fridge_items
where user_id::text = '139104d3-f796-4479-a91e-61242bc590bf';

delete from public.family_members
where user_id::text = '139104d3-f796-4479-a91e-61242bc590bf';

delete from public.user_profile
where id::text = '139104d3-f796-4479-a91e-61242bc590bf';

-- Profile
insert into public.user_profile (id, name, baby_name, baby_months_old, email)
values (
  '139104d3-f796-4479-a91e-61242bc590bf',
  '하은맘',
  '하은이',
  11,
  'haeunmom@example.com'
);

-- Fridge (cube only uses quantity)
insert into public.fridge_items (id, user_id, name, category, quantity, expires_at, source)
values
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '소고기 큐브', 'other', '12개', null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '바나나 큐브', 'other', '8개', null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '브로콜리 큐브', 'other', '12개', null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '닭가슴살', 'protein', null, null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '고등어', 'protein', null, null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '브로콜리', 'vegetable', null, null, 'manual'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '사과', 'fruit', null, null, 'manual');

-- Family
insert into public.family_members (id, user_id, name, role, status, invited_at)
values
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '하은아빠', 'father', 'connected', now()),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', '할머니', 'grandparent', 'pending', now());

-- Meals (today)
insert into public.meal_entries (id, user_id, date, meal_type, menu_name, quantity, memo, reaction)
values
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'breakfast', '소고기 미역죽', null, null, 'loved'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'breakfast', '바나나 큐브', null, null, 'loved'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'lunch', '닭안심 채소죽', null, null, 'okay'),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'lunch', '바나나 큐브', null, null, null),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'dinner', '미역 두부국', null, null, null),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'dinner', '소고기야채 주먹밥', null, null, null),
  (gen_random_uuid()::text, '139104d3-f796-4479-a91e-61242bc590bf', current_date, 'snack', '바나나 큐브', null, null, 'loved');

commit;

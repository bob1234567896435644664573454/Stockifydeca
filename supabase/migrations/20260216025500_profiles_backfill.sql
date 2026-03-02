-- Backfill profile rows for any existing auth users that predate the trigger.
insert into public.profiles (user_id, display_name, role, org_id, school_id)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ) as display_name,
  case
    when (u.raw_app_meta_data ->> 'role') in ('platform_admin', 'org_admin', 'teacher', 'student') then
      (u.raw_app_meta_data ->> 'role')::public.app_role
    when (u.raw_user_meta_data ->> 'role') in ('platform_admin', 'org_admin', 'teacher', 'student') then
      (u.raw_user_meta_data ->> 'role')::public.app_role
    else
      'student'::public.app_role
  end as role,
  null::uuid as org_id,
  null::uuid as school_id
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;


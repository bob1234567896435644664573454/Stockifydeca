-- Auto-provision public.profiles rows for newly created auth users.
--
-- Without this, a real user who signs up via Supabase Auth has no profile row,
-- and Stockify's Edge Functions (requireAuth) will reject them.

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_display_name text;
  v_email text;
begin
  v_email := coalesce(new.email, '');

  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', null);
  if v_display_name is null or length(trim(v_display_name)) = 0 then
    if v_email <> '' then
      v_display_name := split_part(v_email, '@', 1);
    else
      v_display_name := 'User';
    end if;
  end if;

  begin
    v_role := coalesce(
      new.raw_app_meta_data ->> 'role',
      new.raw_user_meta_data ->> 'role',
      'student'
    )::public.app_role;
  exception when others then
    v_role := 'student'::public.app_role;
  end;

  insert into public.profiles (user_id, display_name, role, org_id, school_id)
  values (new.id, v_display_name, v_role, null, null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

-- Backfill any existing auth users missing profiles (created before this migration).
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

revoke all on function public.handle_auth_user_created() from public, anon, authenticated;

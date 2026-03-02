-- Prevent recursive RLS evaluation when helper functions read profiles.

create or replace function public.current_app_role()
returns public.app_role
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  );

  if v_role is null and auth.uid() is not null then
    select p.role::text into v_role
    from public.profiles p
    where p.user_id = auth.uid();
  end if;

  if v_role is null then
    return 'student'::public.app_role;
  end if;

  return v_role::public.app_role;
exception
  when others then
    return 'student'::public.app_role;
end;
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.org_id
  from public.profiles p
  where p.user_id = auth.uid();
$$;

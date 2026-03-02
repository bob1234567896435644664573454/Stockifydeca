-- Realtime outbox triggers

create or replace function public.trg_announcement_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select c.org_id into v_org_id
  from public.classes c
  where c.id = new.class_id;

  perform public.emit_event(
    v_org_id,
    new.class_id,
    'announcement.created',
    'announcements',
    new.id,
    jsonb_build_object(
      'announcement_id', new.id,
      'class_id', new.class_id,
      'title', new.title,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

create or replace function public.trg_trading_control_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_org_id uuid;
begin
  if new.scope_type = 'class' then
    v_class_id := new.scope_id;
  else
    select a.class_id into v_class_id
    from public.trading_accounts a
    where a.id = new.scope_id;
  end if;

  select c.org_id into v_org_id
  from public.classes c
  where c.id = v_class_id;

  perform public.emit_event(
    v_org_id,
    v_class_id,
    'trading_control.updated',
    'trading_controls',
    new.scope_id,
    jsonb_build_object(
      'scope_type', new.scope_type,
      'scope_id', new.scope_id,
      'is_trading_enabled', new.is_trading_enabled,
      'reason', new.reason,
      'updated_at', new.updated_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_announcements_emit on public.announcements;
create trigger trg_announcements_emit
after insert on public.announcements
for each row execute function public.trg_announcement_event();

drop trigger if exists trg_trading_controls_emit on public.trading_controls;
create trigger trg_trading_controls_emit
after insert or update on public.trading_controls
for each row execute function public.trg_trading_control_event();

-- Storage bucket + realtime publication

-- insert into storage.buckets (id, name, public)
-- values ('reports', 'reports', false)
-- on conflict (id) do nothing;

-- Optional: keep objects private; signed URLs are generated via service role.

DO $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.events';
  exception when duplicate_object then
    null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.announcements';
  exception when duplicate_object then
    null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.trading_controls';
  exception when duplicate_object then
    null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.orders';
  exception when duplicate_object then
    null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.fills';
  exception when duplicate_object then
    null;
  end;
end
$$;

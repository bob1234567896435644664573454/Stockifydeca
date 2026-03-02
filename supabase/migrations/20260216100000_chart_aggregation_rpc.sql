-- RPC to get OHLC bars with optional aggregation
-- If timeframe is '1m', returns raw 1m bars from cache.
-- If timeframe is > 1m (e.g. 5m, 1h, 1d), aggregates 1m bars.

create or replace function public.get_ohlc_bars(
  p_symbol text,
  p_timeframe text, -- '1m', '5m', '1h', '1d'
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 1000
)
returns table (
  ts timestamptz,
  o numeric,
  h numeric,
  l numeric,
  c numeric,
  v numeric
)
language plpgsql
as $$
declare
  bucket_width interval;
begin
  -- 1. If timeframe is '1m', just return the cached bars directly
  if p_timeframe = '1m' then
    return query
    select
      m.ts,
      m.o,
      m.h,
      m.l,
      m.c,
      m.v
    from public.market_bars_cache m
    where m.symbol = p_symbol
      and m.timeframe = '1m'
      and m.ts >= p_from
      and m.ts <= p_to
    order by m.ts asc
    limit p_limit;
    return;
  end if;

  -- 2. Determine bucket width for aggregation
  if p_timeframe = '5m' then
    bucket_width := interval '5 minutes';
  elsif p_timeframe = '1h' then
    bucket_width := interval '1 hour';
  elsif p_timeframe = '1d' then
    bucket_width := interval '1 day';
  else
    -- Fallback or error? For now, default to 1m request effectively
    raise exception 'Unsupported timeframe for aggregation: %', p_timeframe;
  end if;

  -- 3. Perform Aggregation from 1m bars
  -- We use date_bin (Postgres 14+) for efficient bucketing
  return query
  with grouped as (
    select
      date_bin(bucket_width, m.ts, '2000-01-01') as bucket_ts,
      m.o,
      m.h,
      m.l,
      m.c,
      m.v,
      m.ts as raw_ts
    from public.market_bars_cache m
    where m.symbol = p_symbol
      and m.timeframe = '1m' -- Always aggregate from base 1m bars
      and m.ts >= p_from
      and m.ts <= p_to
  ),
  aggs as (
    select
      bucket_ts as ts,
      (array_agg(o order by raw_ts asc))[1] as o,
      max(h) as h,
      min(l) as l,
      (array_agg(c order by raw_ts desc))[1] as c,
      sum(v) as v
    from grouped
    group by bucket_ts
  )
  select
    a.ts,
    a.o,
    a.h,
    a.l,
    a.c,
    a.v
  from aggs a
  order by a.ts asc
  limit p_limit;
end;
$$;

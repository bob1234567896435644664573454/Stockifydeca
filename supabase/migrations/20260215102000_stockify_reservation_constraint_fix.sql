-- Allow reservation amount to be zero once released.
alter table public.reservations
  drop constraint if exists reservations_amount_check;

alter table public.reservations
  add constraint reservations_amount_check
  check (amount > 0 or released_at is not null);

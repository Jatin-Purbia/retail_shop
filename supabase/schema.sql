-- Run once in Supabase Dashboard -> SQL Editor.

create table if not exists public.inventory (
  id          bigint generated always as identity primary key,
  name        text not null,
  hindi_name  text not null,
  unit        text not null,
  rate_a      numeric(10,2),
  rate_b      numeric(10,2),
  rate_c      numeric(10,2)
);

create table if not exists public.bills (
  id                   bigint generated always as identity primary key,
  customer_name        text,
  customer_name_hindi  text,
  customer_mobile      text,
  alternate_mobile     text,
  delivery_date        date,
  delivery_time_hindi  text,
  items                jsonb not null default '[]'::jsonb,
  total_amount         numeric(12,2),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at before update on public.bills
  for each row execute function public.set_updated_at();

-- Row level security: only signed-in users (Auth -> Users in the dashboard) can access data.
alter table public.inventory enable row level security;
alter table public.bills     enable row level security;

drop policy if exists "inventory open access" on public.inventory;
drop policy if exists "inventory authenticated access" on public.inventory;
create policy "inventory authenticated access" on public.inventory
  for all to authenticated using (true) with check (true);

drop policy if exists "bills open access" on public.bills;
drop policy if exists "bills authenticated access" on public.bills;
create policy "bills authenticated access" on public.bills
  for all to authenticated using (true) with check (true);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.tasks
  alter column user_id drop not null;

alter table public.push_subscriptions
  alter column user_id drop not null;

alter table public.todos
  alter column user_id drop not null;

alter table public.tasks
  add column if not exists device_id text;

alter table public.push_subscriptions
  add column if not exists device_id text;

alter table public.todos
  add column if not exists device_id text;

update public.tasks
set device_id = coalesce(device_id, user_id::text)
where device_id is null
  and user_id is not null;

update public.push_subscriptions
set device_id = coalesce(device_id, user_id::text)
where device_id is null
  and user_id is not null;

update public.todos
set device_id = coalesce(device_id, user_id::text)
where device_id is null
  and user_id is not null;

create index if not exists tasks_device_id_idx
  on public.tasks (device_id);

create index if not exists push_subscriptions_device_id_idx
  on public.push_subscriptions (device_id);

create index if not exists todos_device_id_idx
  on public.todos (device_id);

create unique index if not exists push_subscriptions_device_endpoint_key
  on public.push_subscriptions (device_id, endpoint);

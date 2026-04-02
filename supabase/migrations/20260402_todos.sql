create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists todos_user_id_idx
  on public.todos (user_id);

create index if not exists todos_created_at_idx
  on public.todos (created_at desc);

alter table public.todos enable row level security;
alter table public.todos force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'todos_select_own'
  ) then
    create policy todos_select_own
      on public.todos
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'todos_insert_own'
  ) then
    create policy todos_insert_own
      on public.todos
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'todos_update_own'
  ) then
    create policy todos_update_own
      on public.todos
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'todos'
      and policyname = 'todos_delete_own'
  ) then
    create policy todos_delete_own
      on public.todos
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

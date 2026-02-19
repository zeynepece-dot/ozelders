create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

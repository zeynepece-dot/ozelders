-- 001_init.sql
-- Supabase SQL Editor üzerinde tek seferde çalıştırılabilir.

create extension if not exists "pgcrypto";

create type student_status as enum ('AKTIF', 'PASIF');
create type lesson_status as enum ('YAPILDI', 'GELMEDI', 'IPTAL');
create type no_show_fee_rule as enum ('UCRET_ALINMAZ', 'YARIM_UCRET', 'TAM_UCRET');
create type payment_status as enum ('ODENDI', 'ODENMEDI', 'KISMI');
create type recurrence_edit_scope as enum ('THIS', 'THIS_AND_FUTURE', 'ALL');
create type recurrence_frequency as enum ('WEEKLY', 'BIWEEKLY');
create type homework_status as enum ('BEKLIYOR', 'TAMAMLANDI');

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  subject text not null,
  hourly_rate_default numeric(10,2) not null default 0,
  phone text,
  email text,
  parent_name text,
  parent_phone text,
  notes text,
  status student_status not null default 'AKTIF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  frequency recurrence_frequency not null default 'WEEKLY',
  interval_weeks int not null default 1,
  weekdays int[] not null default '{}',
  start_datetime timestamptz not null,
  end_date date,
  repeat_count int,
  timezone text not null default 'Europe/Istanbul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  recurrence_id uuid references recurrences(id) on delete set null,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  duration_hours numeric(5,2) not null,
  status lesson_status not null default 'YAPILDI',
  no_show_fee_rule no_show_fee_rule not null default 'UCRET_ALINMAZ',
  hourly_rate numeric(10,2) not null,
  fee_total numeric(10,2) not null,
  payment_status payment_status not null default 'ODENMEDI',
  amount_paid numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status homework_status not null default 'BEKLIYOR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calendar_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  admin_email text,
  overdue_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_owner on students(owner_id);
create index if not exists idx_lessons_owner_start on lessons(owner_id, start_datetime);
create index if not exists idx_lessons_student on lessons(student_id);
create index if not exists idx_recurrences_owner on recurrences(owner_id);
create index if not exists idx_student_notes_owner on student_notes(owner_id);
create index if not exists idx_homework_owner on homework(owner_id);
create index if not exists idx_calendar_notes_owner on calendar_notes(owner_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_students_updated before update on students
for each row execute function set_updated_at();
create trigger trg_recurrences_updated before update on recurrences
for each row execute function set_updated_at();
create trigger trg_lessons_updated before update on lessons
for each row execute function set_updated_at();
create trigger trg_student_notes_updated before update on student_notes
for each row execute function set_updated_at();
create trigger trg_homework_updated before update on homework
for each row execute function set_updated_at();
create trigger trg_calendar_notes_updated before update on calendar_notes
for each row execute function set_updated_at();
create trigger trg_settings_updated before update on settings
for each row execute function set_updated_at();

alter table students enable row level security;
alter table recurrences enable row level security;
alter table lessons enable row level security;
alter table student_notes enable row level security;
alter table homework enable row level security;
alter table calendar_notes enable row level security;
alter table settings enable row level security;

create policy "students_owner_policy" on students
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "recurrences_owner_policy" on recurrences
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "lessons_owner_policy" on lessons
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "student_notes_owner_policy" on student_notes
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "homework_owner_policy" on homework
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "calendar_notes_owner_policy" on calendar_notes
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "settings_owner_policy" on settings
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

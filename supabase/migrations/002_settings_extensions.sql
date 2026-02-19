alter table settings
  add column if not exists workday_start text not null default '08:00',
  add column if not exists workday_end text not null default '22:00',
  add column if not exists week_start integer not null default 1,
  add column if not exists hide_weekends boolean not null default false,
  add column if not exists holidays jsonb not null default '[]'::jsonb,
  add column if not exists default_hourly_rate numeric not null default 0,
  add column if not exists default_no_show_fee_rule text not null default 'UCRET_ALINMAZ';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settings_week_start_check'
  ) then
    alter table settings
      add constraint settings_week_start_check check (week_start in (0, 1));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settings_default_no_show_fee_rule_check'
  ) then
    alter table settings
      add constraint settings_default_no_show_fee_rule_check
      check (default_no_show_fee_rule in ('UCRET_ALINMAZ', 'YARIM_UCRET', 'TAM_UCRET'));
  end if;
end $$;

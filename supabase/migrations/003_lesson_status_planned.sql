do $$
begin
  alter type lesson_status add value if not exists 'PLANLANDI';
exception
  when duplicate_object then null;
end $$;

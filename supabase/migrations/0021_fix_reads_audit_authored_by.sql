-- Fix column name: data_governance_log uses 'authored_by', not 'recorded_by'
drop function if exists public.reads_audit() cascade;

create function public.reads_audit()
returns trigger as $$
begin
  if (tg_op = 'UPDATE' and old.status = 'published' and new.status != old.status) then
    insert into public.data_governance_log (category, title, body, authored_by)
    values (
      'review',
      'Read "' || new.title || '" status changed',
      'Status changed from ' || old.status || ' to ' || new.status,
      auth.uid()
    );
  elsif tg_op = 'INSERT' and new.status = 'published' then
    insert into public.data_governance_log (category, title, body, authored_by)
    values (
      'review',
      'Published read "' || new.title || '"',
      'Authored by ' || coalesce(new.author_id::text, 'unknown'),
      auth.uid()
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists reads_audit_trigger on public.reads;
create trigger reads_audit_trigger
  after insert or update on public.reads
  for each row execute function public.reads_audit();

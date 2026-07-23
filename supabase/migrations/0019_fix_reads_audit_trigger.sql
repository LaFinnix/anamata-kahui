-- Replace the buggy reads_audit() function (was using non-existent columns)
drop trigger if exists reads_audit_trigger on public.reads;
drop function if exists public.reads_audit() cascade;

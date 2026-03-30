-- Enable pg_cron extension (available by default on Supabase)
create extension if not exists pg_cron with schema pg_catalog;

-- Grant usage to postgres role (required on Supabase hosted)
grant usage on schema cron to postgres;

-- Schedule: every hour, delete pending invitations past their expires_at
select cron.schedule(
  'cleanup-expired-invitations',
  '0 * * * *',
  $$delete from public.invitation where status = 'pending' and expires_at < now()$$
);

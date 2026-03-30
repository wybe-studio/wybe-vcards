-- RPC to reject an invitation.
-- SECURITY DEFINER because the rejecting user is not an org member.
create or replace function public.reject_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  v_user_email := auth.jwt() ->> 'email';

  select * into v_invitation
  from public.invitation
  where id = p_invitation_id
    and status = 'pending';

  if not found then
    raise exception 'Invito non trovato o già elaborato';
  end if;

  if v_invitation.email != v_user_email then
    raise exception 'Questo invito non è per il tuo account';
  end if;

  update public.invitation set status = 'rejected' where id = p_invitation_id;
end;
$$;

revoke execute on function public.reject_invitation(uuid) from public;
grant execute on function public.reject_invitation(uuid) to authenticated;

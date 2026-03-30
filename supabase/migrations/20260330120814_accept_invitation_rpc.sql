-- RPC to accept an invitation: creates membership and marks invitation as accepted.
-- SECURITY DEFINER because the accepting user is not yet an org member,
-- so RLS would block both the INSERT on member and UPDATE on invitation.
create or replace function public.accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  -- Get the current user's email from JWT
  v_user_email := auth.jwt() ->> 'email';

  -- Find the pending invitation
  select * into v_invitation
  from public.invitation
  where id = p_invitation_id
    and status = 'pending';

  if not found then
    raise exception 'Invito non trovato o già elaborato';
  end if;

  -- Verify the invitation is for this user
  if v_invitation.email != v_user_email then
    raise exception 'Questo invito non è per il tuo account';
  end if;

  -- Check expiry
  if v_invitation.expires_at < now() then
    update public.invitation set status = 'canceled' where id = p_invitation_id;
    raise exception 'Questo invito è scaduto';
  end if;

  -- Create the membership
  insert into public.member (organization_id, user_id, role)
  values (v_invitation.organization_id, auth.uid(), v_invitation.role);

  -- Mark invitation as accepted
  update public.invitation set status = 'accepted' where id = p_invitation_id;

  return v_invitation.organization_id;
end;
$$;

-- Revoke from public, grant only to authenticated
revoke execute on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;

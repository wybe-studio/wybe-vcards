-- Helper functions used by RLS policies across multiple tables.
-- This file must run AFTER enums (01-enums.sql) and BEFORE table definitions (02+).

-- Check if current user is member of an organization
create or replace function public.is_organization_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.member
    where organization_id = org_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Check if user has specific role (or higher)
create or replace function public.has_org_role(org_id uuid, required_role text)
returns boolean as $$
  select exists (
    select 1 from public.member
    where organization_id = org_id and user_id = auth.uid()
    and (
      case required_role
        when 'member' then role in ('member', 'admin', 'owner')
        when 'admin' then role in ('admin', 'owner')
        when 'owner' then role = 'owner'
        else false
      end
    )
  );
$$ language sql security definer stable;

-- Check if user is platform admin
create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from public.user_profile
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- MFA compliance check
-- Returns true if user has no MFA factors, or if they have verified MFA and current session is aal2
create or replace function public.is_mfa_compliant()
returns boolean as $$
declare has_factors boolean;
begin
  select exists (
    select 1 from auth.mfa_factors
    where user_id = auth.uid() and status = 'verified'
  ) into has_factors;

  if has_factors then
    return (select (auth.jwt()->>'aal') = 'aal2');
  else
    return true;
  end if;
end;
$$ language plpgsql security definer stable;

-- Credit deduction (atomic transaction)
create or replace function public.deduct_credits(
  p_organization_id uuid,
  p_amount integer,
  p_description text,
  p_model text default null
) returns jsonb as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  select balance into v_balance
  from credit_balance
  where organization_id = p_organization_id
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient credits: have %, need %', v_balance, p_amount;
  end if;

  v_new_balance := v_balance - p_amount;

  update credit_balance
  set balance = v_new_balance, updated_at = now()
  where organization_id = p_organization_id;

  insert into credit_transaction (organization_id, type, amount, balance_after, description, model)
  values (p_organization_id, 'usage', -p_amount, v_new_balance, p_description, p_model);

  return jsonb_build_object('balance', v_new_balance);
end;
$$ language plpgsql security definer;

-- Add credits (atomic transaction)
create or replace function public.add_credits(
  p_organization_id uuid,
  p_amount integer,
  p_type public.credit_transaction_type,
  p_description text default null
) returns jsonb as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  select balance into v_balance
  from credit_balance
  where organization_id = p_organization_id
  for update;

  if not found then
    insert into credit_balance (organization_id, balance, lifetime_purchased, lifetime_granted)
    values (
      p_organization_id,
      p_amount,
      case when p_type = 'purchase' then p_amount else 0 end,
      case when p_type in ('subscription_grant', 'bonus', 'promo') then p_amount else 0 end
    );
    v_new_balance := p_amount;
  else
    v_new_balance := v_balance + p_amount;

    update credit_balance
    set
      balance = v_new_balance,
      lifetime_purchased = lifetime_purchased + case when p_type = 'purchase' then p_amount else 0 end,
      lifetime_granted = lifetime_granted + case when p_type in ('subscription_grant', 'bonus', 'promo') then p_amount else 0 end,
      updated_at = now()
    where organization_id = p_organization_id;
  end if;

  insert into credit_transaction (organization_id, type, amount, balance_after, description)
  values (p_organization_id, p_type, p_amount, v_new_balance, p_description);

  return jsonb_build_object('balance', v_new_balance);
end;
$$ language plpgsql security definer;

-- Seat sync with advisory lock (atomic)
create or replace function public.sync_organization_seats(
  p_organization_id uuid
) returns jsonb as $$
declare
  v_member_count integer;
  v_subscription_id text;
  v_current_quantity integer;
begin
  -- Advisory lock prevents concurrent syncs for same org
  if not pg_try_advisory_xact_lock(123456789,
    hashtext(p_organization_id::text)) then
    return jsonb_build_object('skipped', true, 'reason', 'lock_not_acquired');
  end if;

  -- Count active members
  select count(*) into v_member_count
  from member where organization_id = p_organization_id;

  -- Get active subscription with seat-based pricing
  select s.id, s.quantity into v_subscription_id, v_current_quantity
  from subscription s
  where s.organization_id = p_organization_id
  and s.status in ('active', 'trialing');

  if v_subscription_id is null then
    return jsonb_build_object('skipped', true, 'reason', 'no_active_subscription');
  end if;

  if v_current_quantity = v_member_count then
    return jsonb_build_object('skipped', true, 'reason', 'already_in_sync');
  end if;

  -- Update local quantity (Stripe update done in application layer)
  update subscription
  set quantity = v_member_count, updated_at = now()
  where id = v_subscription_id;

  return jsonb_build_object(
    'updated', true,
    'subscription_id', v_subscription_id,
    'old_quantity', v_current_quantity,
    'new_quantity', v_member_count
  );
end;
$$ language plpgsql security definer;

-- AI chat listing with JSONB first message extraction
create or replace function public.list_ai_chats(
  p_organization_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
) returns table(
  id uuid, title text, pinned boolean, created_at timestamptz,
  first_message_content text
) as $$
  select id, title, pinned, created_at,
    case when messages is not null and messages::jsonb != '[]'::jsonb
      then (messages::jsonb->0->>'content')
      else null
    end as first_message_content
  from ai_chat
  where organization_id = p_organization_id
  order by pinned desc, created_at desc
  limit p_limit offset p_offset;
$$ language sql security definer stable;

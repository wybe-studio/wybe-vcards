-- =============================================================================
-- Migration: security_and_performance_fixes
-- Fixes:
--   1. search_path injection on SECURITY DEFINER functions (CRITICAL)
--   2. RLS initplan: wrap auth.uid()/auth.jwt() in (select ...) (PERFORMANCE)
--   3. Consolidate multiple permissive policies (PERFORMANCE)
--   4. Missing FK indexes (PERFORMANCE)
--   5. Remove redundant indexes (PERFORMANCE)
--   6. Fix storage UPDATE policy with_check (SECURITY)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: Set search_path on all SECURITY DEFINER functions
-- Prevents search_path injection attacks
-- ─────────────────────────────────────────────────────────────────────────────

-- Functions that already use fully-qualified references → search_path = ''
ALTER FUNCTION public.is_organization_member(uuid) SET search_path = '';
ALTER FUNCTION public.has_org_role(uuid, text) SET search_path = '';
ALTER FUNCTION public.is_platform_admin() SET search_path = '';
ALTER FUNCTION public.is_mfa_compliant() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.prevent_owner_removal() SET search_path = '';

-- protect_user_profile_fields calls public.is_platform_admin() (qualified)
ALTER FUNCTION public.protect_user_profile_fields() SET search_path = '';

-- trigger_set_updated_at is not SECURITY DEFINER but still flagged by linter
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = '';

-- Functions that reference unqualified tables → need to be recreated with
-- fully-qualified references and search_path = ''

CREATE OR REPLACE FUNCTION public.add_credits(
  p_organization_id uuid,
  p_amount integer,
  p_type credit_transaction_type,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_balance integer;
  v_new_balance integer;
begin
  select balance into v_balance
  from public.credit_balance
  where organization_id = p_organization_id
  for update;

  if not found then
    insert into public.credit_balance (organization_id, balance, lifetime_purchased, lifetime_granted)
    values (
      p_organization_id,
      p_amount,
      case when p_type = 'purchase' then p_amount else 0 end,
      case when p_type in ('subscription_grant', 'bonus', 'promo') then p_amount else 0 end
    );
    v_new_balance := p_amount;
  else
    v_new_balance := v_balance + p_amount;

    update public.credit_balance
    set
      balance = v_new_balance,
      lifetime_purchased = lifetime_purchased + case when p_type = 'purchase' then p_amount else 0 end,
      lifetime_granted = lifetime_granted + case when p_type in ('subscription_grant', 'bonus', 'promo') then p_amount else 0 end,
      updated_at = now()
    where organization_id = p_organization_id;
  end if;

  insert into public.credit_transaction (organization_id, type, amount, balance_after, description)
  values (p_organization_id, p_type, p_amount, v_new_balance, p_description);

  return jsonb_build_object('balance', v_new_balance);
end;
$function$;

CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_organization_id uuid,
  p_amount integer,
  p_description text,
  p_model text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_balance integer;
  v_new_balance integer;
begin
  select balance into v_balance
  from public.credit_balance
  where organization_id = p_organization_id
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient credits: have %, need %', v_balance, p_amount;
  end if;

  v_new_balance := v_balance - p_amount;

  update public.credit_balance
  set balance = v_new_balance, updated_at = now()
  where organization_id = p_organization_id;

  insert into public.credit_transaction (organization_id, type, amount, balance_after, description, model)
  values (p_organization_id, 'usage', -p_amount, v_new_balance, p_description, p_model);

  return jsonb_build_object('balance', v_new_balance);
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_organization_seats(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_member_count integer;
  v_subscription_id text;
  v_current_quantity integer;
begin
  if not pg_try_advisory_xact_lock(123456789,
    hashtext(p_organization_id::text)) then
    return jsonb_build_object('skipped', true, 'reason', 'lock_not_acquired');
  end if;

  select count(*) into v_member_count
  from public.member where organization_id = p_organization_id;

  select s.id, s.quantity into v_subscription_id, v_current_quantity
  from public.subscription s
  where s.organization_id = p_organization_id
  and s.status in ('active', 'trialing');

  if v_subscription_id is null then
    return jsonb_build_object('skipped', true, 'reason', 'no_active_subscription');
  end if;

  if v_current_quantity = v_member_count then
    return jsonb_build_object('skipped', true, 'reason', 'already_in_sync');
  end if;

  update public.subscription
  set quantity = v_member_count, updated_at = now()
  where id = v_subscription_id;

  return jsonb_build_object(
    'updated', true,
    'subscription_id', v_subscription_id,
    'old_quantity', v_current_quantity,
    'new_quantity', v_member_count
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_ai_chats(
  p_organization_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  pinned boolean,
  created_at timestamptz,
  first_message_content text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  select id, title, pinned, created_at,
    case when messages is not null and messages::jsonb != '[]'::jsonb
      then (messages::jsonb->0->>'content')
      else null
    end as first_message_content
  from public.ai_chat
  where organization_id = p_organization_id
  order by pinned desc, created_at desc
  limit p_limit offset p_offset;
$function$;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: RLS initplan — wrap auth.uid()/auth.jwt() in (select ...)
-- Avoids per-row re-evaluation, evaluated once per query instead
-- ─────────────────────────────────────────────────────────────────────────────

-- user_profile: read
DROP POLICY "Users can read own profile" ON public.user_profile;
CREATE POLICY "Users can read own profile" ON public.user_profile
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR is_platform_admin());

-- user_profile: update
DROP POLICY "Users can update own profile" ON public.user_profile;
CREATE POLICY "Users can update own profile" ON public.user_profile
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR is_platform_admin())
  WITH CHECK (id = (select auth.uid()) OR is_platform_admin());

-- member: update
DROP POLICY "Org admins can update members" ON public.member;
CREATE POLICY "Org admins can update members" ON public.member
  FOR UPDATE TO authenticated
  USING (
    (has_org_role(organization_id, 'admin') AND user_id <> (select auth.uid()))
    OR is_platform_admin()
  )
  WITH CHECK (
    (has_org_role(organization_id, 'admin') AND user_id <> (select auth.uid()))
    OR is_platform_admin()
  );

-- member: delete
DROP POLICY "Org admins can remove members or self-leave" ON public.member;
CREATE POLICY "Org admins can remove members or self-leave" ON public.member
  FOR DELETE TO authenticated
  USING (
    has_org_role(organization_id, 'admin')
    OR user_id = (select auth.uid())
    OR is_platform_admin()
  );

-- member: insert (creator first member)
-- Changed from TO public to TO authenticated since it uses auth.uid()
-- Also consolidated with "Org admins can add members" to avoid multiple
-- permissive INSERT policies for the same role
DROP POLICY "Creator can be first org member" ON public.member;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: Consolidate multiple permissive SELECT policies on invitation
-- Two permissive policies on same role+action = both evaluated every query
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY "Org members can read invitations" ON public.invitation;
DROP POLICY "Users can read invitations addressed to them" ON public.invitation;
CREATE POLICY "Users can read invitations" ON public.invitation
  FOR SELECT TO authenticated
  USING (
    is_organization_member(organization_id)
    OR email = ((select auth.jwt()) ->> 'email')
    OR is_platform_admin()
  );

-- member INSERT: consolidate two permissive policies into one
DROP POLICY IF EXISTS "Org admins can add members" ON public.member;
CREATE POLICY "Members can be added to organizations" ON public.member
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admin/owner can add any member
    has_org_role(organization_id, 'admin')
    OR is_platform_admin()
    -- Creator can be first org member (owner role, no existing members)
    OR (
      user_id = (select auth.uid())
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.member m
        WHERE m.organization_id = member.organization_id
      )
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4: Add missing FK indexes on credit_deduction_failure / credit_transaction
-- Without these, FK lookups and cascading deletes do sequential scans
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS credit_deduction_failure_user_id_idx
  ON public.credit_deduction_failure (user_id);

CREATE INDEX IF NOT EXISTS credit_deduction_failure_resolved_by_idx
  ON public.credit_deduction_failure (resolved_by);

CREATE INDEX IF NOT EXISTS credit_transaction_created_by_idx
  ON public.credit_transaction (created_by);


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 5: Remove redundant indexes
-- credit_transaction_organization_id_idx is covered by org_created and org_type
-- credit_balance_organization_id_idx is covered by organization_id_key (UNIQUE)
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.credit_transaction_organization_id_idx;
DROP INDEX IF EXISTS public.credit_balance_organization_id_idx;


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 6: Fix storage UPDATE policy — restrict with_check to own folder
-- Previously with_check only checked bucket_id, allowing path manipulation
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

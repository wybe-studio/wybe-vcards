-- RLS policy: allow creator to be first org member (chicken-and-egg fix)
CREATE POLICY "Creator can be first org member"
ON public.member
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.member m WHERE m.organization_id = member.organization_id
  )
);

-- RPC to atomically create an organization and assign the creator as owner.
-- Uses SECURITY DEFINER to bypass the RLS chicken-and-egg problem:
-- the user can't be a member before the org exists, but INSERT/SELECT
-- policies require membership.
-- Always uses auth.uid() internally to prevent privilege escalation via direct PostgREST calls.
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_user_id uuid DEFAULT NULL,
  p_metadata text DEFAULT NULL
)
RETURNS public.organization
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organization;
  v_user_id uuid;
BEGIN
  -- Always use the authenticated user, ignore p_user_id parameter
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Create the organization
  INSERT INTO public.organization (name, slug, metadata)
  VALUES (p_name, p_slug, p_metadata)
  RETURNING * INTO v_org;

  -- 2. Add creator as owner
  INSERT INTO public.member (organization_id, user_id, role)
  VALUES (v_org.id, v_user_id, 'owner');

  -- 3. Initialize credit balance
  INSERT INTO public.credit_balance (organization_id)
  VALUES (v_org.id)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN v_org;
END;
$$;

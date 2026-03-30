-- Allow owner removal when the organization itself is being deleted (CASCADE).
-- During CASCADE, the parent organization row is already deleted,
-- so we check if the org still exists to distinguish from direct member removal.
CREATE OR REPLACE FUNCTION public.prevent_owner_removal()
RETURNS trigger AS $$
DECLARE
  v_owner_count integer;
  v_org_exists boolean;
BEGIN
  IF old.role = 'owner' THEN
    -- If the organization is being deleted (CASCADE), allow the member removal
    SELECT EXISTS(
      SELECT 1 FROM public.organization WHERE id = old.organization_id
    ) INTO v_org_exists;

    IF NOT v_org_exists THEN
      RETURN old;
    END IF;

    SELECT count(*) INTO v_owner_count
    FROM public.member
    WHERE organization_id = old.organization_id
    AND role = 'owner'
    AND id != old.id;

    IF v_owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last owner of an organization';
    END IF;
  END IF;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

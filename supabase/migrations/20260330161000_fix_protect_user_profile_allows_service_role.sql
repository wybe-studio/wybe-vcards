-- Allow service_role (admin client) to modify protected fields.
-- The current trigger only checks is_platform_admin() which relies on auth.uid(),
-- but service_role calls have auth.uid() = NULL. We also allow when the current
-- role is service_role or supabase_admin (used by admin client).
CREATE OR REPLACE FUNCTION public.protect_user_profile_fields()
RETURNS trigger AS $$
BEGIN
  -- Service role and supabase_admin bypass this check (admin client operations)
  IF current_setting('role', true) IN ('service_role', 'supabase_admin') THEN
    RETURN new;
  END IF;

  -- If the user is not a platform admin, prevent changing role and banned fields
  IF NOT public.is_platform_admin() THEN
    new.role := old.role;
    new.banned := old.banned;
    new.ban_reason := old.ban_reason;
    new.ban_expires := old.ban_expires;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

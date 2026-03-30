-- Add UPDATE policy for invitation table
-- Allows org admins/owners to update invitation status (cancel, etc.)
create policy "Org admins can update invitations"
  on public.invitation for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

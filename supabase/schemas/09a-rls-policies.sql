-- RLS Policies for all tables.
-- This file must run AFTER 01a-functions.sql (helper functions) and AFTER all table files (02-09).

-- ============================================================
-- user_profile
-- ============================================================

-- SELECT: own profile or platform admin
create policy "Users can read own profile"
  on public.user_profile for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

-- UPDATE: own profile (trigger protects role/banned) or platform admin
create policy "Users can update own profile"
  on public.user_profile for update to authenticated
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());


-- ============================================================
-- organization
-- ============================================================

-- SELECT: members only
create policy "Members can read organization"
  on public.organization for select to authenticated
  using (public.is_organization_member(id) or public.is_platform_admin());

-- INSERT: any authenticated user can create an org
create policy "Authenticated users can create organizations"
  on public.organization for insert to authenticated
  with check (true);

-- UPDATE: org admin/owner
create policy "Org admins can update organization"
  on public.organization for update to authenticated
  using (public.has_org_role(id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(id, 'admin') or public.is_platform_admin());

-- DELETE: org owner only
create policy "Org owner can delete organization"
  on public.organization for delete to authenticated
  using (public.has_org_role(id, 'owner') or public.is_platform_admin());


-- ============================================================
-- member
-- ============================================================

-- SELECT: members of same org
create policy "Members can read org members"
  on public.member for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

-- INSERT: org admin/owner
create policy "Org admins can add members"
  on public.member for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- UPDATE: admin/owner (not self)
create policy "Org admins can update members"
  on public.member for update to authenticated
  using (
    (public.has_org_role(organization_id, 'admin') and user_id != auth.uid())
    or public.is_platform_admin()
  )
  with check (
    (public.has_org_role(organization_id, 'admin') and user_id != auth.uid())
    or public.is_platform_admin()
  );

-- DELETE: admin/owner can remove, user can leave self
create policy "Org admins can remove members or self-leave"
  on public.member for delete to authenticated
  using (
    public.has_org_role(organization_id, 'admin')
    or user_id = auth.uid()
    or public.is_platform_admin()
  );


-- ============================================================
-- invitation
-- ============================================================

-- SELECT: org members
create policy "Org members can read invitations"
  on public.invitation for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

-- SELECT: invitation recipient (not yet a member, needs to accept/reject)
create policy "Users can read invitations addressed to them"
  on public.invitation for select to authenticated
  using (email = auth.jwt() ->> 'email');

-- INSERT: org admin/owner
create policy "Org admins can create invitations"
  on public.invitation for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- UPDATE: org admin/owner
create policy "Org admins can update invitations"
  on public.invitation for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- DELETE: org admin/owner
create policy "Org admins can delete invitations"
  on public.invitation for delete to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());


-- ============================================================
-- lead
-- ============================================================

-- All CRUD: org members
create policy "Org members have full access to leads"
  on public.lead for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- ai_chat
-- ============================================================

-- All CRUD: org members
create policy "Org members have full access to ai chats"
  on public.ai_chat for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- subscription
-- ============================================================

-- SELECT: org members can read
create policy "Org members can read subscriptions"
  on public.subscription for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- subscription_item
-- ============================================================

-- SELECT: via subscription's org membership
create policy "Org members can read subscription items"
  on public.subscription_item for select to authenticated
  using (
    exists (
      select 1 from public.subscription s
      where s.id = subscription_id
      and public.is_organization_member(s.organization_id)
    )
    or public.is_platform_admin()
  );


-- ============================================================
-- order
-- ============================================================

create policy "Org members can read orders"
  on public."order" for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- order_item
-- ============================================================

create policy "Org members can read order items"
  on public.order_item for select to authenticated
  using (
    exists (
      select 1 from public."order" o
      where o.id = order_id
      and public.is_organization_member(o.organization_id)
    )
    or public.is_platform_admin()
  );


-- ============================================================
-- billing_event
-- ============================================================

create policy "Org members can read billing events"
  on public.billing_event for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- credit_balance
-- ============================================================

create policy "Org members have full access to credit balance"
  on public.credit_balance for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- credit_transaction
-- ============================================================

create policy "Org members have full access to credit transactions"
  on public.credit_transaction for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- ============================================================
-- credit_deduction_failure
-- ============================================================

create policy "Org members can read deduction failures"
  on public.credit_deduction_failure for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

# Phase 4: RLS Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify that Row-Level Security policies are correctly enforced on all tables, ensuring cross-organization data isolation and proper admin bypass.
**Depends on:** Phase 3
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md`

---

## Task 23: Test RLS policies

### Files

- `supabase/schemas/*.sql` (RLS policies defined in Phase 0)
- New test file: `tests/rls/rls-verification.test.ts` (or manual verification script)

### Steps

- [ ] 1. **Reset the local Supabase database to ensure all schemas and policies are applied**

  ```bash
  supabase db reset
  ```

  This re-applies all SQL files from `supabase/schemas/` in order, including RLS policies, helper functions, and triggers.

- [ ] 2. **Verify RLS is enabled on all public tables**

  Connect to the local Supabase database and run:
  ```sql
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```

  Expected: `rowsecurity = true` for ALL of these tables:
  - `user_profile`
  - `organization`
  - `member`
  - `invitation`
  - `lead`
  - `ai_chat`
  - `credit_balance`
  - `credit_transaction`
  - `credit_deduction_failure`
  - `subscription`
  - `subscription_item`
  - `order`
  - `order_item`
  - `billing_event`

  If any table shows `rowsecurity = false`, fix the corresponding schema file and re-run `supabase db reset`.

- [ ] 3. **List all RLS policies to verify they exist**

  ```sql
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
  ```

  Verify that each table has the expected policies per the spec (Section 6):
  - `user_profile`: SELECT own + admin, UPDATE own + admin
  - `organization`: SELECT members, INSERT authenticated, UPDATE admin/owner, DELETE owner, platform admin full
  - `member`: SELECT same org, INSERT admin/owner, UPDATE admin/owner, DELETE admin/owner + self-leave
  - `invitation`: SELECT org members, INSERT/DELETE admin/owner
  - `lead`: all CRUD for org members, platform admin full
  - `ai_chat`: all CRUD for org members, platform admin full
  - `credit_balance`: all CRUD for org members, platform admin full
  - `credit_transaction`: all CRUD for org members, platform admin full
  - Billing tables (`subscription`, `order`, `billing_event`, etc.): SELECT for org members, INSERT/UPDATE/DELETE service_role only

- [ ] 4. **Verify helper functions exist and work**

  ```sql
  -- Test is_organization_member()
  -- This should be callable and return boolean
  SELECT proname, proargtypes
  FROM pg_proc
  WHERE proname IN ('is_organization_member', 'has_org_role', 'is_platform_admin', 'is_mfa_compliant')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  ```

  Expected: all 4 functions exist.

- [ ] 5. **Create 2 test users in 2 different organizations**

  Using the Supabase dashboard or the admin client, create test data:

  ```typescript
  import { createAdminClient } from "@/lib/supabase/admin";
  import { createClient } from "@supabase/supabase-js";

  const admin = createAdminClient();

  // Create User A
  const { data: userA } = await admin.auth.admin.createUser({
    email: "user-a@test.local",
    password: "TestPassword123!",
    email_confirm: true,
  });

  // Create User B
  const { data: userB } = await admin.auth.admin.createUser({
    email: "user-b@test.local",
    password: "TestPassword123!",
    email_confirm: true,
  });

  // Create Organization A
  const { data: orgA } = await admin
    .from("organization")
    .insert({ name: "Org A", slug: "org-a" })
    .select()
    .single();

  // Create Organization B
  const { data: orgB } = await admin
    .from("organization")
    .insert({ name: "Org B", slug: "org-b" })
    .select()
    .single();

  // Add User A to Org A as owner
  await admin.from("member").insert({
    organization_id: orgA.id,
    user_id: userA.user.id,
    role: "owner",
  });

  // Add User B to Org B as owner
  await admin.from("member").insert({
    organization_id: orgB.id,
    user_id: userB.user.id,
    role: "owner",
  });

  // Create test leads in each org
  await admin.from("lead").insert([
    { first_name: "Lead A1", organization_id: orgA.id, email: "lead-a1@test.local" },
    { first_name: "Lead A2", organization_id: orgA.id, email: "lead-a2@test.local" },
  ]);

  await admin.from("lead").insert([
    { first_name: "Lead B1", organization_id: orgB.id, email: "lead-b1@test.local" },
    { first_name: "Lead B2", organization_id: orgB.id, email: "lead-b2@test.local" },
  ]);

  // Create test AI chats
  await admin.from("ai_chat").insert([
    { organization_id: orgA.id, user_id: userA.user.id, title: "Chat A1" },
  ]);
  await admin.from("ai_chat").insert([
    { organization_id: orgB.id, user_id: userB.user.id, title: "Chat B1" },
  ]);

  // Create credit balances
  await admin.from("credit_balance").insert([
    { organization_id: orgA.id, balance: 1000 },
    { organization_id: orgB.id, balance: 2000 },
  ]);
  ```

- [ ] 6. **Test that User A cannot access User B's data (cross-org isolation)**

  Sign in as User A using a browser client and verify:

  ```typescript
  // Create a client authenticated as User A
  const supabaseA = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  await supabaseA.auth.signInWithPassword({
    email: "user-a@test.local",
    password: "TestPassword123!",
  });

  // TEST 1: User A can see their own leads
  const { data: ownLeads } = await supabaseA.from("lead").select("*");
  console.assert(ownLeads?.length === 2, "User A should see 2 leads");
  console.assert(
    ownLeads?.every((l) => l.organization_id === orgA.id),
    "All leads should belong to Org A"
  );

  // TEST 2: User A CANNOT see Org B's leads
  const { data: crossOrgLeads } = await supabaseA
    .from("lead")
    .select("*")
    .eq("organization_id", orgB.id);
  console.assert(
    crossOrgLeads?.length === 0,
    "User A should NOT see Org B leads"
  );

  // TEST 3: User A CANNOT read Org B's organization record
  const { data: crossOrg } = await supabaseA
    .from("organization")
    .select("*")
    .eq("id", orgB.id);
  console.assert(
    crossOrg?.length === 0,
    "User A should NOT see Org B"
  );

  // TEST 4: User A CANNOT see Org B's members
  const { data: crossMembers } = await supabaseA
    .from("member")
    .select("*")
    .eq("organization_id", orgB.id);
  console.assert(
    crossMembers?.length === 0,
    "User A should NOT see Org B members"
  );

  // TEST 5: User A CANNOT see Org B's AI chats
  const { data: crossChats } = await supabaseA
    .from("ai_chat")
    .select("*")
    .eq("organization_id", orgB.id);
  console.assert(
    crossChats?.length === 0,
    "User A should NOT see Org B chats"
  );

  // TEST 6: User A CANNOT see Org B's credit balance
  const { data: crossCredits } = await supabaseA
    .from("credit_balance")
    .select("*")
    .eq("organization_id", orgB.id);
  console.assert(
    crossCredits?.length === 0,
    "User A should NOT see Org B credits"
  );

  // TEST 7: User A CANNOT insert a lead into Org B
  const { error: insertError } = await supabaseA
    .from("lead")
    .insert({
      first_name: "Hacked Lead",
      organization_id: orgB.id,
      email: "hack@test.local",
    });
  console.assert(
    insertError !== null,
    "User A should NOT be able to insert leads into Org B"
  );

  // TEST 8: User A CANNOT update a lead in Org B
  const { data: updated } = await supabaseA
    .from("lead")
    .update({ first_name: "Hacked" })
    .eq("organization_id", orgB.id)
    .select();
  console.assert(
    updated?.length === 0,
    "User A should NOT be able to update Org B leads"
  );

  // TEST 9: User A CANNOT delete a lead in Org B
  const { data: deleted } = await supabaseA
    .from("lead")
    .delete()
    .eq("organization_id", orgB.id)
    .select();
  console.assert(
    deleted?.length === 0,
    "User A should NOT be able to delete Org B leads"
  );
  ```

- [ ] 7. **Test that admin client bypasses RLS correctly**

  ```typescript
  const admin = createAdminClient();

  // TEST 1: Admin can see ALL leads across all orgs
  const { data: allLeads } = await admin.from("lead").select("*");
  console.assert(
    allLeads!.length >= 4,
    "Admin should see all leads across all orgs"
  );

  // TEST 2: Admin can see ALL organizations
  const { data: allOrgs } = await admin.from("organization").select("*");
  console.assert(
    allOrgs!.length >= 2,
    "Admin should see all organizations"
  );

  // TEST 3: Admin can insert/update/delete across any org
  const { error: adminInsert } = await admin.from("lead").insert({
    first_name: "Admin Created",
    organization_id: orgB.id,
    email: "admin-lead@test.local",
  });
  console.assert(
    adminInsert === null,
    "Admin should be able to insert into any org"
  );

  // TEST 4: Admin can update user profiles (ban, role change)
  const { error: adminBan } = await admin
    .from("user_profile")
    .update({ banned: true, ban_reason: "Test ban" })
    .eq("id", userB.user.id);
  console.assert(
    adminBan === null,
    "Admin should be able to ban any user"
  );

  // Cleanup: unban
  await admin
    .from("user_profile")
    .update({ banned: false, ban_reason: null })
    .eq("id", userB.user.id);
  ```

- [ ] 8. **Test helper functions directly**

  ```sql
  -- Test as User A (set auth.uid() for testing)
  -- In a Supabase SQL editor or via RPC:

  -- is_organization_member should return true for own org
  SELECT public.is_organization_member('<orgA_id>'::uuid);
  -- Expected: true

  -- is_organization_member should return false for other org
  SELECT public.is_organization_member('<orgB_id>'::uuid);
  -- Expected: false

  -- has_org_role checks
  SELECT public.has_org_role('<orgA_id>'::uuid, 'owner');
  -- Expected: true (User A is owner of Org A)

  SELECT public.has_org_role('<orgA_id>'::uuid, 'member');
  -- Expected: true (owner role includes member access)

  SELECT public.has_org_role('<orgB_id>'::uuid, 'member');
  -- Expected: false (User A is not in Org B)

  -- is_platform_admin
  SELECT public.is_platform_admin();
  -- Expected: false (test users are not admins)
  ```

  To test `is_platform_admin()` returning true, set a test user's profile role to `'admin'`:
  ```typescript
  await admin
    .from("user_profile")
    .update({ role: "admin" })
    .eq("id", userA.user.id);

  // Now sign in as User A and test
  // is_platform_admin() should return true
  ```

- [ ] 9. **Test trigger protections**

  ```typescript
  // TEST: Non-admin cannot change their own role via user_profile update
  const supabaseA = /* authenticated as User A (non-admin) */;
  const { error: roleError } = await supabaseA
    .from("user_profile")
    .update({ role: "admin" })
    .eq("id", userA.user.id);
  // Expected: error or role unchanged (protect_user_profile_fields trigger)

  // Verify role is still 'user'
  const { data: profile } = await supabaseA
    .from("user_profile")
    .select("role")
    .eq("id", userA.user.id)
    .single();
  console.assert(profile?.role === "user", "Role should not have changed");

  // TEST: Cannot remove last owner from organization
  // (prevent_owner_removal trigger)
  const { error: removeOwnerError } = await admin
    .from("member")
    .delete()
    .eq("organization_id", orgA.id)
    .eq("user_id", userA.user.id)
    .eq("role", "owner");
  console.assert(
    removeOwnerError !== null,
    "Should not be able to remove last owner"
  );
  ```

- [ ] 10. **Test billing table RLS**

  Billing tables should be readable by org members but only writable by service_role:

  ```typescript
  const supabaseA = /* authenticated as User A */;

  // Create a test subscription via admin
  await admin.from("subscription").insert({
    id: "sub_test_123",
    organization_id: orgA.id,
    stripe_customer_id: "cus_test",
    status: "active",
    stripe_price_id: "price_test",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // TEST: User A CAN read their org's subscription
  const { data: subs } = await supabaseA
    .from("subscription")
    .select("*")
    .eq("organization_id", orgA.id);
  console.assert(subs?.length === 1, "User A should see their org subscription");

  // TEST: User A CANNOT insert a subscription
  const { error: subInsertError } = await supabaseA
    .from("subscription")
    .insert({
      id: "sub_hacked",
      organization_id: orgA.id,
      stripe_customer_id: "cus_hacked",
      status: "active",
      stripe_price_id: "price_hacked",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date().toISOString(),
    });
  console.assert(subInsertError !== null, "User should NOT be able to insert subscriptions");

  // TEST: User A CANNOT update a subscription
  const { data: subUpdated } = await supabaseA
    .from("subscription")
    .update({ status: "canceled" })
    .eq("id", "sub_test_123")
    .select();
  console.assert(
    subUpdated?.length === 0,
    "User should NOT be able to update subscriptions"
  );

  // TEST: User A CANNOT delete a subscription
  const { data: subDeleted } = await supabaseA
    .from("subscription")
    .delete()
    .eq("id", "sub_test_123")
    .select();
  console.assert(
    subDeleted?.length === 0,
    "User should NOT be able to delete subscriptions"
  );
  ```

- [ ] 11. **Clean up test data**

  ```typescript
  const admin = createAdminClient();

  // Delete test data in reverse order of dependencies
  await admin.from("ai_chat").delete().in("organization_id", [orgA.id, orgB.id]);
  await admin.from("lead").delete().in("organization_id", [orgA.id, orgB.id]);
  await admin.from("credit_balance").delete().in("organization_id", [orgA.id, orgB.id]);
  await admin.from("subscription").delete().eq("id", "sub_test_123");
  await admin.from("member").delete().in("organization_id", [orgA.id, orgB.id]);
  await admin.from("organization").delete().in("id", [orgA.id, orgB.id]);
  await admin.auth.admin.deleteUser(userA.user.id);
  await admin.auth.admin.deleteUser(userB.user.id);
  ```

- [ ] 12. **Document any RLS policy fixes** -- if any test failed, fix the corresponding SQL policy in `supabase/schemas/` and re-run `supabase db reset`.

- [ ] 13. **Commit**: `git commit -m "test(task-23): verify RLS policies for all tables"`

---

## Verification Checklist

After completing this phase:

- [ ] All public tables have `rowsecurity = true`
- [ ] Every table has appropriate SELECT/INSERT/UPDATE/DELETE policies
- [ ] Cross-organization data isolation confirmed (User A cannot access User B's data)
- [ ] Admin client (service_role) bypasses RLS correctly
- [ ] Helper functions (`is_organization_member`, `has_org_role`, `is_platform_admin`) work correctly
- [ ] Billing tables are read-only for authenticated users, writable only by service_role
- [ ] Trigger protections work (profile field protection, last owner removal prevention)
- [ ] No test data remains in the database after cleanup

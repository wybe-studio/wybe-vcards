# Phase 0: Supabase Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize the Supabase project locally, create all SQL schema files, and generate TypeScript types so subsequent phases have a working database.
**Depends on:** Nothing (this is the first phase)
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md` Section 2, 6

---

## Task 1: Initialize Supabase and Install Dependencies

> For agentic workers: this task sets up the local Supabase project and installs the required npm packages. Run commands in the project root.

### Steps

1. Install Supabase CLI (if not already available):

```bash
npx supabase init
```

2. Install npm dependencies:

```bash
npm install @supabase/ssr @supabase/supabase-js
```

3. Verify `supabase/config.toml` was created in the project root.

4. Update `supabase/config.toml` to configure auth providers (Google OAuth, TOTP MFA):

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"

[auth.mfa]
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

5. Create the `supabase/schemas/` directory:

```bash
mkdir -p supabase/schemas
```

### Verification

- `supabase/config.toml` exists and has auth configuration
- `@supabase/ssr` and `@supabase/supabase-js` appear in `package.json` dependencies
- `supabase/schemas/` directory exists

---

## Task 2: Write SQL Schemas - Extensions and Enums

> For agentic workers: create the first two SQL files that set up PostgreSQL extensions and all enum types. These must run before any table definitions.

### File: `supabase/schemas/00-extensions.sql`

```sql
-- Enable required PostgreSQL extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
```

### File: `supabase/schemas/01-enums.sql`

These enums map directly from the current Prisma schema (`prisma/schema.prisma`):

```sql
-- Billing interval for subscriptions
create type public.billing_interval as enum ('day', 'week', 'month', 'year');

-- Credit transaction types
create type public.credit_transaction_type as enum (
  'purchase', 'subscription_grant', 'bonus', 'promo',
  'usage', 'refund', 'expire', 'adjustment'
);

-- Invitation status
create type public.invitation_status as enum ('pending', 'accepted', 'rejected', 'canceled');

-- Lead source
create type public.lead_source as enum (
  'website', 'referral', 'social_media', 'advertising',
  'cold_call', 'email', 'event', 'other'
);

-- Lead status
create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'proposal',
  'negotiation', 'won', 'lost'
);

-- Member role in organization
create type public.member_role as enum ('owner', 'admin', 'member');

-- Order status
create type public.order_status as enum (
  'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
);

-- Order type
create type public.order_type as enum ('subscription', 'one_time');

-- Price model
create type public.price_model as enum ('flat', 'per_seat', 'metered');

-- Price type
create type public.price_type as enum ('recurring', 'one_time');

-- Subscription status
create type public.subscription_status as enum (
  'active', 'canceled', 'incomplete', 'incomplete_expired',
  'past_due', 'paused', 'trialing', 'unpaid'
);

-- User role (platform level)
create type public.user_role as enum ('user', 'admin');
```

### Verification

- Both files exist in `supabase/schemas/`
- All 12 enums from the Prisma schema are represented
- Enum values use snake_case (matching the Prisma `@map()` values)

---

## Task 3: Write SQL Schemas - Core Tables (user_profile, organization, member, invitation)

> For agentic workers: create the core tables that replace the Prisma User/Account/Session models and preserve Organization/Member/Invitation. The `user_profile` table is new - it stores custom fields that Supabase `auth.users` does not have.

### File: `supabase/schemas/02-user-profile.sql`

```sql
-- user_profile stores custom fields not in auth.users
-- Auto-created via trigger on auth.users insert (see 11-triggers.sql)
create table public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  onboarding_complete boolean not null default false,
  banned boolean not null default false,
  ban_reason text,
  ban_expires timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index user_profile_role_idx on public.user_profile(role);
create index user_profile_banned_idx on public.user_profile(banned);

-- RLS
alter table public.user_profile enable row level security;

-- SELECT: own profile or platform admin
create policy "Users can read own profile"
  on public.user_profile for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());

-- UPDATE: own profile (trigger protects role/banned) or platform admin
create policy "Users can update own profile"
  on public.user_profile for update to authenticated
  using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());
```

### File: `supabase/schemas/03-organization.sql`

```sql
create table public.organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  logo text,
  metadata text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index organization_name_idx on public.organization(name);
create index organization_stripe_customer_id_idx on public.organization(stripe_customer_id);

-- RLS
alter table public.organization enable row level security;

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
```

### File: `supabase/schemas/04-member.sql`

```sql
create table public.member (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, organization_id)
);

-- Indexes
create index member_organization_id_idx on public.member(organization_id);
create index member_user_id_idx on public.member(user_id);
create index member_role_idx on public.member(role);

-- RLS
alter table public.member enable row level security;

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
```

### File: `supabase/schemas/05-invitation.sql`

```sql
create table public.invitation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Indexes
create index invitation_organization_id_idx on public.invitation(organization_id);
create index invitation_email_idx on public.invitation(email);
create index invitation_status_idx on public.invitation(status);
create index invitation_expires_at_idx on public.invitation(expires_at);
create index invitation_inviter_id_idx on public.invitation(inviter_id);

-- RLS
alter table public.invitation enable row level security;

-- SELECT: org members
create policy "Org members can read invitations"
  on public.invitation for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

-- INSERT: org admin/owner
create policy "Org admins can create invitations"
  on public.invitation for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- DELETE: org admin/owner
create policy "Org admins can delete invitations"
  on public.invitation for delete to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());
```

### Verification

- 4 files created: `02-user-profile.sql`, `03-organization.sql`, `04-member.sql`, `05-invitation.sql`
- All columns match the Prisma schema (with snake_case naming)
- RLS is enabled on every table
- Policies match the spec: user_profile (own + admin), organization (member read, admin write), member (member read, admin write, self-leave), invitation (member read, admin write)

---

## Task 4: Write SQL Schemas - Feature Tables (lead, ai_chat)

> For agentic workers: create the tenant-scoped feature tables. These are straightforward migrations from Prisma models with RLS policies for organization member access.

### File: `supabase/schemas/06-lead.sql`

```sql
create table public.lead (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  company text,
  job_title text,
  status public.lead_status not null default 'new',
  source public.lead_source not null default 'other',
  estimated_value integer,
  notes text,
  assigned_to_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index lead_organization_id_idx on public.lead(organization_id);
create index lead_status_idx on public.lead(status);
create index lead_source_idx on public.lead(source);
create index lead_assigned_to_id_idx on public.lead(assigned_to_id);
create index lead_email_idx on public.lead(email);
create index lead_created_at_idx on public.lead(created_at);
create index lead_org_status_idx on public.lead(organization_id, status);

-- RLS
alter table public.lead enable row level security;

-- All CRUD: org members
create policy "Org members have full access to leads"
  on public.lead for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());
```

### File: `supabase/schemas/07-ai-chat.sql`

```sql
create table public.ai_chat (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  messages text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index ai_chat_organization_id_idx on public.ai_chat(organization_id);
create index ai_chat_user_id_idx on public.ai_chat(user_id);
create index ai_chat_created_at_idx on public.ai_chat(created_at);

-- RLS
alter table public.ai_chat enable row level security;

-- All CRUD: org members
create policy "Org members have full access to ai chats"
  on public.ai_chat for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());
```

### Verification

- 2 files created: `06-lead.sql`, `07-ai-chat.sql`
- All columns match Prisma models with snake_case naming
- RLS enabled with org member access policies

---

## Task 5: Write SQL Schemas - Billing and Credit Tables

> For agentic workers: create the billing-related tables. Billing tables are mostly read-only for authenticated users (writes happen via Stripe webhooks using the service_role admin client). Credit tables need org member access.

### File: `supabase/schemas/08-billing.sql`

```sql
-- Subscription (ID is text, from Stripe)
create table public.subscription (
  id text primary key,
  organization_id uuid not null references public.organization(id) on delete cascade,
  stripe_customer_id text not null,
  status public.subscription_status not null,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  interval public.billing_interval not null,
  interval_count integer not null default 1,
  unit_amount integer,
  currency text not null default 'usd',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index subscription_organization_id_idx on public.subscription(organization_id);
create index subscription_stripe_customer_id_idx on public.subscription(stripe_customer_id);
create index subscription_status_idx on public.subscription(status);
create index subscription_stripe_price_id_idx on public.subscription(stripe_price_id);
create index subscription_org_status_idx on public.subscription(organization_id, status);

-- RLS
alter table public.subscription enable row level security;

-- SELECT: org members can read
create policy "Org members can read subscriptions"
  on public.subscription for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

-- INSERT/UPDATE/DELETE: service_role only (webhook handler)
-- No policies for insert/update/delete for authenticated role.
-- The admin client (service_role) bypasses RLS.


-- Subscription Item (ID is text, from Stripe)
create table public.subscription_item (
  id text primary key,
  subscription_id text not null references public.subscription(id) on delete cascade,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  price_amount integer,
  price_type public.price_type not null default 'recurring',
  price_model public.price_model not null default 'flat',
  interval public.billing_interval,
  interval_count integer default 1,
  meter_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index subscription_item_subscription_id_idx on public.subscription_item(subscription_id);
create index subscription_item_stripe_price_id_idx on public.subscription_item(stripe_price_id);
create index subscription_item_price_model_idx on public.subscription_item(price_model);

-- RLS
alter table public.subscription_item enable row level security;

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


-- Order
create table public."order" (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  total_amount integer not null,
  currency text not null default 'usd',
  status public.order_status not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index order_organization_id_idx on public."order"(organization_id);
create index order_stripe_customer_id_idx on public."order"(stripe_customer_id);
create index order_status_idx on public."order"(status);
create index order_payment_intent_id_idx on public."order"(stripe_payment_intent_id);
create index order_checkout_session_id_idx on public."order"(stripe_checkout_session_id);

-- RLS
alter table public."order" enable row level security;

create policy "Org members can read orders"
  on public."order" for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());


-- Order Item
create table public.order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public."order"(id) on delete cascade,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  unit_amount integer not null,
  total_amount integer not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index order_item_order_id_idx on public.order_item(order_id);
create index order_item_stripe_price_id_idx on public.order_item(stripe_price_id);

-- RLS
alter table public.order_item enable row level security;

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


-- Billing Event (idempotency tracking for Stripe webhooks)
create table public.billing_event (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  subscription_id text,
  order_id uuid,
  event_data text,
  processed boolean not null default true,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index billing_event_organization_id_idx on public.billing_event(organization_id);
create index billing_event_event_type_idx on public.billing_event(event_type);
create index billing_event_subscription_id_idx on public.billing_event(subscription_id);
create index billing_event_created_at_idx on public.billing_event(created_at);

-- RLS
alter table public.billing_event enable row level security;

create policy "Org members can read billing events"
  on public.billing_event for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());
```

### File: `supabase/schemas/09-credits.sql`

```sql
-- Credit Balance (one per organization)
create table public.credit_balance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organization(id) on delete cascade,
  balance integer not null default 0,
  lifetime_purchased integer not null default 0,
  lifetime_granted integer not null default 0,
  lifetime_used integer not null default 0,
  lifetime_expired integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index credit_balance_organization_id_idx on public.credit_balance(organization_id);

-- RLS
alter table public.credit_balance enable row level security;

create policy "Org members have full access to credit balance"
  on public.credit_balance for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- Credit Transaction
create table public.credit_transaction (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  type public.credit_transaction_type not null,
  amount integer not null,
  balance_after integer not null,
  description text,
  reference_type text,
  reference_id text,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_by uuid references auth.users(id) on delete set null,
  metadata text,
  created_at timestamptz not null default now()
);

-- Indexes
create index credit_transaction_organization_id_idx on public.credit_transaction(organization_id);
create index credit_transaction_type_idx on public.credit_transaction(type);
create index credit_transaction_created_at_idx on public.credit_transaction(created_at);
create index credit_transaction_reference_idx on public.credit_transaction(reference_type, reference_id);
create index credit_transaction_org_created_idx on public.credit_transaction(organization_id, created_at);
create index credit_transaction_org_type_idx on public.credit_transaction(organization_id, type);

-- RLS
alter table public.credit_transaction enable row level security;

create policy "Org members have full access to credit transactions"
  on public.credit_transaction for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());


-- Credit Deduction Failure (audit log)
create table public.credit_deduction_failure (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  amount integer not null,
  error_code text not null,
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  reference_type text,
  reference_id text,
  user_id uuid references auth.users(id) on delete set null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index credit_deduction_failure_org_idx on public.credit_deduction_failure(organization_id);
create index credit_deduction_failure_resolved_idx on public.credit_deduction_failure(resolved);
create index credit_deduction_failure_created_idx on public.credit_deduction_failure(created_at);

-- RLS
alter table public.credit_deduction_failure enable row level security;

create policy "Org members can read deduction failures"
  on public.credit_deduction_failure for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());
```

### Verification

- 2 files created: `08-billing.sql`, `09-credits.sql`
- All billing tables have read-only RLS for authenticated (writes via service_role)
- Credit tables have full CRUD for org members
- All indexes match the Prisma schema

---

## Task 6: Write SQL Schemas - Helper Functions, RLS Helpers, Triggers, MFA, Storage

> For agentic workers: create the helper functions that RLS policies depend on, all triggers, MFA restrictive policies, and storage bucket setup. These files MUST be created because the RLS policies in Tasks 3-5 reference these functions.

### File: `supabase/schemas/10-functions.sql`

```sql
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
$$ language plpgsql security definer;
```

### File: `supabase/schemas/11-triggers.sql`

```sql
-- Auto-create user_profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profile (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- Protect role and banned fields from non-admin updates
create or replace function public.protect_user_profile_fields()
returns trigger as $$
begin
  -- If the user is not a platform admin, prevent changing role and banned
  if not public.is_platform_admin() then
    new.role := old.role;
    new.banned := old.banned;
    new.ban_reason := old.ban_reason;
    new.ban_expires := old.ban_expires;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger protect_user_profile_fields_trigger
  before update on public.user_profile
  for each row execute function protect_user_profile_fields();


-- Prevent removal of last org owner
create or replace function public.prevent_owner_removal()
returns trigger as $$
declare
  v_owner_count integer;
begin
  if old.role = 'owner' then
    select count(*) into v_owner_count
    from public.member
    where organization_id = old.organization_id
    and role = 'owner'
    and id != old.id;

    if v_owner_count = 0 then
      raise exception 'Cannot remove the last owner of an organization';
    end if;
  end if;
  return old;
end;
$$ language plpgsql security definer;

create trigger prevent_owner_removal_trigger
  before delete on public.member
  for each row execute function prevent_owner_removal();


-- Auto-update updated_at timestamp
create or replace function public.trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all relevant tables
create trigger set_updated_at before update on public.user_profile
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.organization
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.member
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.lead
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.ai_chat
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.subscription
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.subscription_item
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public."order"
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.order_item
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.billing_event
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.credit_balance
  for each row execute function trigger_set_updated_at();
```

### File: `supabase/schemas/12-mfa.sql`

```sql
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

-- Optional restrictive MFA policies (enable later when enforcing MFA)
-- Uncomment these when you want to require MFA for sensitive data:

-- create policy "restrict_mfa_leads" on public.lead
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());

-- create policy "restrict_mfa_credits" on public.credit_balance
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());

-- create policy "restrict_mfa_ai_chat" on public.ai_chat
--   as restrictive for all to authenticated
--   using (is_mfa_compliant());
```

### File: `supabase/schemas/13-storage.sql`

```sql
-- Create the public images bucket for avatars and logos
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Public read access (avatars/logos are public)
create policy "Public read access for images"
  on storage.objects for select
  using (bucket_id = 'images');

-- Authenticated users can upload
create policy "Authenticated users can upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images');

-- Owner-only update (UUID in filename matches user)
create policy "Users can update own images"
  on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'images');

-- Owner-only delete
create policy "Users can delete own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
```

### File: `supabase/schemas/14-seed.sql`

```sql
-- Seed data for development
-- This file runs after all schema files
-- Add development seed data here as needed
```

### Verification

- 5 files created: `10-functions.sql`, `11-triggers.sql`, `12-mfa.sql`, `13-storage.sql`, `14-seed.sql`
- Helper functions (`is_organization_member`, `has_org_role`, `is_platform_admin`) are defined BEFORE the table schemas reference them
- **IMPORTANT NOTE:** Files `10-functions.sql` must be loaded BEFORE files `02-07` that use those functions in RLS policies. Ensure the Supabase migration or seed ordering handles this (either reorder files or use a single migration that includes functions first).
- All triggers from the spec are present: `handle_new_user`, `protect_user_profile_fields`, `prevent_owner_removal`, `trigger_set_updated_at`

---

## Task 7: Start Supabase and Generate Types

> For agentic workers: start the local Supabase instance, apply all schemas, and generate the TypeScript types file that the rest of the codebase will use.

### Steps

1. Start the local Supabase stack:

```bash
npx supabase start
```

This will output the local URLs and keys:
- API URL: `http://127.0.0.1:54321`
- Anon key (publishable): `sb_publishable_...`
- Service role key: `sb_secret_...`

2. Apply the SQL schemas. If using migrations, create a migration:

```bash
npx supabase migration new initial_schema
```

Then copy/concatenate all SQL files from `supabase/schemas/` into the migration file (in numeric order, with `10-functions.sql` BEFORE `02-user-profile.sql` through `09-credits.sql`).

Alternatively, apply directly via `psql` or the Supabase SQL editor.

3. Generate TypeScript types:

```bash
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

4. Create the `lib/supabase/` directory if it does not exist:

```bash
mkdir -p lib/supabase
```

5. Add the Supabase env vars to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<anon-key-from-supabase-start>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-from-supabase-start>"
```

6. Add a convenience script to `package.json`:

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/supabase/database.types.ts"
  }
}
```

### Verification

- `npx supabase status` shows all services running
- `lib/supabase/database.types.ts` exists and contains type definitions for all tables
- `.env.local` has the three Supabase env vars
- All tables are visible in Supabase Studio at `http://127.0.0.1:54323`

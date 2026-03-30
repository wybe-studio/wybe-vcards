# Supabase Migration Design Spec

**Date:** 2026-03-27
**Status:** Draft
**Approach:** B - Complete replacement (Supabase-native)

## 1. Overview

Migrate the achromatic-pro SaaS starter kit from its current stack (Better Auth + Prisma + S3 Storage) to a fully Supabase-native architecture (Supabase Auth + Supabase client JS + Supabase Storage + RLS).

### Goals

- Replace Better Auth with Supabase Auth (email/password, Google OAuth, MFA TOTP)
- Replace Prisma ORM with Supabase client JS for all database access
- Replace S3/R2 storage with Supabase Storage
- Add Row-Level Security (RLS) for database-level multi-tenant protection
- Maintain tRPC as the API layer (only data source changes)
- Keep Stripe billing integration (reconnect in a later phase)

### Non-Goals (deferred)

- Billing re-integration (later phase)
- Impersonation (nice-to-have)
- User banning with expiry (nice-to-have, basic check implemented)
- Supabase Realtime
- Supabase Edge Functions

### References

- **Vercel Next.js 16 + Supabase example:** `github.com/vercel/next.js/tree/canary/examples/with-supabase`
- **MakerKit Supabase SaaS kit:** Analyzed for patterns (RLS, auth, storage, organizations)
- **Supabase docs:** `getClaims()` recommended over `getUser()` for JWT verification

---

## 2. Architecture & Database Schema

### Philosophy

The data model stays substantially identical to the current Prisma schema (16 models, 12 enums). Key differences:

- Auth tables (User, Account, Session, Verification, TwoFactor) are **eliminated** - managed by Supabase `auth.users`
- A new `user_profile` table stores custom fields (role, banned, onboardingComplete)
- All tenant-scoped tables get RLS policies
- Supabase client replaces Prisma for all queries

### Table Mapping

| Current (Prisma)       | New (Supabase)                        | Notes                                         |
|------------------------|---------------------------------------|-----------------------------------------------|
| `User`                 | `auth.users` + `public.user_profile`  | Auth by Supabase, custom fields in profile    |
| `Account`              | Eliminated                            | Supabase manages OAuth identities             |
| `Session`              | Eliminated                            | JWT + cookies managed by Supabase             |
| `Verification`         | Eliminated                            | Supabase handles email verification           |
| `TwoFactor`            | Eliminated                            | Supabase MFA native (auth.mfa_factors)        |
| `Organization`         | `public.organization`                 | Unchanged + RLS                               |
| `Member`               | `public.member`                       | Unchanged + RLS                               |
| `Invitation`           | `public.invitation`                   | Unchanged + RLS                               |
| `Subscription`         | `public.subscription`                 | Unchanged (billing later)                     |
| `SubscriptionItem`     | `public.subscription_item`            | Unchanged                                     |
| `Order`                | `public.order`                        | Unchanged                                     |
| `OrderItem`            | `public.order_item`                   | Unchanged                                     |
| `BillingEvent`         | `public.billing_event`               | Unchanged                                     |
| `CreditBalance`        | `public.credit_balance`               | Unchanged + RLS                               |
| `CreditTransaction`    | `public.credit_transaction`           | Unchanged + RLS                               |
| `CreditDeductionFailure` | `public.credit_deduction_failure`  | Unchanged                                     |
| `Lead`                 | `public.lead`                         | Unchanged + RLS                               |
| `AiChat`               | `public.ai_chat`                      | Unchanged + RLS                               |

### New Table: `user_profile`

```sql
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
```

Auto-created via trigger on `auth.users` insert:

```sql
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
```

### Naming Convention

Prisma uses camelCase with `@map()`. Supabase uses native snake_case. All column names in TypeScript code become snake_case:

```typescript
// Before: lead.firstName, lead.organizationId
// After:  lead.first_name, lead.organization_id
```

### Type Generation

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

Generates TypeScript interfaces for all tables, views, and functions. Replaces Prisma-generated types.

---

## 3. Supabase Client Setup

### Structure

```
lib/supabase/
├── client.ts          # Browser client (createBrowserClient)
├── server.ts          # Server client (createServerClient + cookies)
├── proxy.ts           # Session refresh for proxy.ts (Next.js 16)
├── admin.ts           # Admin client with service_role key
└── database.types.ts  # Auto-generated from DB schema
```

### `lib/supabase/client.ts` - Browser

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### `lib/supabase/server.ts` - Server (respects RLS)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

// IMPORTANT: Do not store in a global variable.
// Always create a new client within each function.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies.
            // Works with proxy session refreshing.
          }
        },
      },
    }
  );
}
```

### `lib/supabase/admin.ts` - Admin (bypasses RLS)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
    }
  );
}
```

### `lib/supabase/proxy.ts` - Session refresh

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getClaims() - recommended over getUser()
  // Local JWT verification, no network call with asymmetric keys
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### Root `proxy.ts` (Next.js 16)

```typescript
import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Three Clients: When to Use Each

| Client   | Respects RLS | Where to Use                                | Key Feature                          |
|----------|-------------|---------------------------------------------|--------------------------------------|
| Browser  | Yes         | Client components, hooks                    | Uses browser cookies                 |
| Server   | Yes         | tRPC procedures, Server Components, Actions | Cookie-based, per-request            |
| Admin    | **No**      | Stripe webhooks, admin operations, triggers | Service role key, no session needed  |

---

## 4. Authentication: Better Auth to Supabase Auth

### Files Eliminated

- `lib/auth/index.ts` (Better Auth config)
- `lib/auth/client.ts` (authClient)
- `app/api/auth/[...all]/route.ts` (Better Auth catch-all)
- Dependencies: `better-auth` and all related packages

### New `lib/auth/` Structure

```
lib/auth/
├── client.ts          # Supabase browser client auth helpers
├── server.ts          # getUser(), assertUserIsOrgMember() via getClaims()
├── constants.ts       # Error messages adapted for Supabase
└── utils.ts           # isOrganizationAdmin(), helpers
```

### Auth Flows

| Flow               | Supabase Method                                       |
|--------------------|-------------------------------------------------------|
| Email/password     | `supabase.auth.signUp()` / `signInWithPassword()`     |
| Google OAuth       | `supabase.auth.signInWithOAuth({ provider: 'google' })`|
| Password reset     | `supabase.auth.resetPasswordForEmail()`               |
| Email change       | `supabase.auth.updateUser({ email })`                 |
| 2FA (TOTP)         | `supabase.auth.mfa.enroll/verify/challenge`           |
| Sign out           | `supabase.auth.signOut()`                             |

### New Auth Routes

```
app/(saas)/auth/
├── sign-in/          # Uses supabase.auth.signInWithPassword
├── sign-up/          # Uses supabase.auth.signUp
├── callback/route.ts # NEW: OAuth callback (exchangeCodeForSession)
├── confirm/route.ts  # NEW: Email verification (verifyOtp)
├── verify/           # NEW: MFA TOTP verification page
└── banned/           # Unchanged
```

### Server-Side Auth: `lib/auth/server.ts`

Uses `getClaims()` (recommended over `getUser()`):
- Local JWT verification via Web Crypto API + JWKS caching
- No network call to Auth server (with asymmetric keys)
- Returns all JWT claims: `sub`, `email`, `aal`, `session_id`, `app_metadata`, `user_metadata`

```typescript
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!data?.claims) return null;

  const claims = data.claims;

  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', claims.sub)
    .single();

  return {
    id: claims.sub,
    email: claims.email,
    phone: claims.phone,
    aal: claims.aal,
    sessionId: claims.session_id,
    isAnonymous: claims.is_anonymous,
    appMetadata: claims.app_metadata,
    userMetadata: claims.user_metadata,
    profile,
  };
});

export const assertUserIsOrgMember = cache(async (orgId: string, userId: string) => {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from('member')
    .select('*, organization(*)')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  if (!member) throw new TRPCError({ code: 'FORBIDDEN' });
  return { organization: member.organization, membership: member };
});
```

### MFA Enforcement

- JWT `aal` field: `aal1` (single factor) vs `aal2` (MFA verified)
- Server-side check in procedures via `claims.aal`
- Database-level enforcement via `is_mfa_compliant()` function in restrictive RLS policies

### Organizations (Custom Tables)

Supabase Auth has no built-in organizations. We keep custom tables:
- `organization`, `member`, `invitation` remain in `public` schema
- `activeOrganizationId` stored in a dedicated httpOnly cookie
- Invitation emails continue via Resend (not Supabase email)

### tRPC Procedure Changes

| Procedure                         | Before                      | After                                    |
|-----------------------------------|-----------------------------|------------------------------------------|
| `protectedProcedure`              | `getSession()` Better Auth  | `getClaims()` + `user_profile` query     |
| `protectedAdminProcedure`         | `user.role === 'admin'`     | `profile.role === 'admin'`               |
| `protectedOrganizationProcedure`  | `assertUserIsOrgMember()`   | Same function, Supabase query            |

Key: `ctx.supabase` is created once in `protectedProcedure` and passed through context to all routers.

---

## 5. Data Access: Prisma to Supabase Client

### Files Eliminated

- `lib/db/prisma.ts`, `prisma-where.ts`, `client.ts`
- `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/`
- Dependencies: `@prisma/client`, `@prisma/adapter-pg`, `pg`

### Query Pattern Conversion

**Read single:**
```typescript
// Before
const lead = await prisma.lead.findFirst({
  where: { id: leadId, organizationId: ctx.organization.id },
});

// After
const { data: lead } = await ctx.supabase
  .from('lead')
  .select('*')
  .eq('id', leadId)
  .eq('organization_id', ctx.organization.id)
  .single();
```

**Read many with filters:**
```typescript
// After
let query = ctx.supabase
  .from('lead')
  .select('*', { count: 'exact' })
  .eq('organization_id', ctx.organization.id)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (statusFilter?.length) {
  query = query.in('status', statusFilter);
}
if (searchQuery) {
  query = query.or(
    `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
  );
}

const { data, count, error } = await query;
```

**Insert:**
```typescript
const { data: lead } = await ctx.supabase
  .from('lead')
  .insert({ first_name: firstName, organization_id: ctx.organization.id })
  .select()
  .single();
```

**Update:**
```typescript
const { data } = await ctx.supabase
  .from('lead')
  .update({ status: 'qualified' })
  .eq('id', leadId)
  .eq('organization_id', ctx.organization.id)
  .select()
  .single();

if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
```

**Upsert:**
```typescript
const { data } = await ctx.supabase
  .from('credit_balance')
  .upsert(
    { organization_id: organizationId, balance: 0 },
    { onConflict: 'organization_id' }
  )
  .select()
  .single();
```

### Transactions: Postgres Functions

Supabase JS client has no `$transaction()`. Critical atomic operations become Postgres functions:

**Credit deduction:**
```sql
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
```

Called via:
```typescript
const { data, error } = await supabase.rpc('deduct_credits', {
  p_organization_id: orgId,
  p_amount: 50,
  p_description: 'AI Chat (gpt-4o-mini)',
  p_model: 'gpt-4o-mini',
});
```

**Advisory locks (seat sync):**
```sql
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
```

**AI chat listing (JSONB extraction):**
```sql
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

### Webhook Handler

Uses admin client (service role) since webhooks have no user session:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();

// Idempotency check
const { data: existingEvent } = await supabase
  .from('billing_event')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();
```

---

## 6. Row-Level Security (RLS)

### Philosophy: Double Protection

RLS at database level + explicit filters in tRPC routers. Defense in depth:
- If a developer forgets the org filter, RLS still blocks
- Direct database access (Studio) is also protected
- Audit permissions by reading SQL policies

### Helper Functions

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

-- MFA compliance check
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
```

### Policy Summary by Table

**`user_profile`:**
- SELECT own profile + admin reads all
- UPDATE own profile (trigger protects role/banned fields) + admin updates all

**`organization`:**
- SELECT: members only (`is_organization_member(id)`)
- INSERT: any authenticated user
- UPDATE: org admin/owner (`has_org_role(id, 'admin')`)
- DELETE: org owner only (`has_org_role(id, 'owner')`)
- Platform admin: full access

**`member`:**
- SELECT: members of same org
- INSERT: org admin/owner
- UPDATE: admin/owner (not self)
- DELETE: admin/owner can remove, user can leave self
- Trigger prevents removing last owner

**`invitation`:**
- SELECT: org members
- INSERT/DELETE: org admin/owner only

**Tenant-scoped tables** (`lead`, `ai_chat`, `credit_balance`, `credit_transaction`):
- All CRUD: `is_organization_member(organization_id)`
- Platform admin: full access

**Billing tables** (`subscription`, `order`, `billing_event`, etc.):
- SELECT: org members
- INSERT/UPDATE/DELETE: service_role only (webhook handler)

**MFA restrictive policies** (optional, enable later):
```sql
create policy "restrict_mfa_leads" on public.lead
  as restrictive for all to authenticated
  using (is_mfa_compliant());
```

### Triggers

- `handle_new_user()`: Auto-create `user_profile` on signup
- `protect_user_profile_fields()`: Prevent non-admin from changing role/banned
- `prevent_owner_removal()`: Block deletion of last org owner
- `trigger_set_updated_at()`: Auto-update `updated_at` on all tables

### Schema Files Organization

```
supabase/schemas/
├── 00-extensions.sql
├── 01-enums.sql
├── 02-user-profile.sql
├── 03-organization.sql
├── 04-member.sql
├── 05-invitation.sql
├── 06-lead.sql
├── 07-ai-chat.sql
├── 08-billing.sql
├── 09-credits.sql
├── 10-functions.sql
├── 11-triggers.sql
├── 12-mfa.sql
├── 13-storage.sql
└── 14-seed.sql
```

---

## 7. Storage: S3/R2 to Supabase Storage

### Files Eliminated

- `lib/storage/s3.ts`
- `config/storage.config.ts`
- `trpc/routers/storage/index.ts` (upload endpoint no longer needed)
- `app/storage/[...path]/route.ts` (proxy no longer needed)
- Dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
- Env vars: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION`, `NEXT_PUBLIC_IMAGES_BUCKET_NAME`

### Setup

Single public bucket `images` for avatars and logos:

```sql
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;
```

RLS policies on `storage.objects`:
- Public read (avatars/logos are public)
- Authenticated upload
- Owner-only update/delete (UUID in filename)

### Upload Flow

No tRPC roundtrip needed. Direct from client:

```typescript
const supabase = createClient();
const fileName = `${userId}-${nanoid()}.png`;

// Delete old file
await supabase.storage.from('images').remove([oldFileName]);

// Upload
await supabase.storage.from('images').upload(fileName, file, {
  contentType: file.type,
  upsert: true,
});

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('images')
  .getPublicUrl(fileName);
```

### New `lib/storage/`

```
lib/storage/
├── index.ts       # Re-export
└── storage.ts     # getPublicImageUrl(), uploadImage(), deleteImage()
```

---

## 8. tRPC Integration

### Principle

tRPC stays as the API layer. Only the data source changes. Router structure, Zod schemas, and React Query patterns remain identical.

### `trpc/init.ts` Key Changes

- `protectedProcedure`: Creates Supabase server client, runs `getClaims()`, fetches `user_profile`, passes `ctx.supabase`
- `protectedAdminProcedure`: Checks `profile.role === 'admin'`
- `protectedOrganizationProcedure`: Reads `activeOrganizationId` from cookie, verifies membership via query, sets `ctx.organization` and `ctx.membership`
- Logging and Sentry middleware: unchanged

### Impact per Router

| Router                              | Change Level | Notes                              |
|-------------------------------------|--------------|------------------------------------|
| `organization-lead-router.ts`       | Medium       | ~10 procedures, mechanical queries |
| `organization-ai-router.ts`         | Medium       | + SQL function for listing         |
| `organization-credit-router.ts`     | Medium       | Read queries only for now          |
| `organization-subscription-router.ts`| Medium      | Read queries only for now          |
| `organization/index.ts`             | Low          | Create org                         |
| `admin-user-router.ts`              | Medium       | Uses admin client                  |
| `admin-organization-router.ts`      | Medium       | Uses admin client                  |
| `contact/index.ts`                  | None         | No DB usage                        |
| `storage/index.ts`                  | **Eliminated** | Direct upload from client        |
| `user/index.ts`                     | Low          | getClaims + identities             |
| `app/api/ai/chat/route.ts`          | Medium       | Queries + rpc credits              |
| `app/api/webhooks/stripe/route.ts`  | Medium       | Admin client                       |

### Billing Layer Files

| File                        | Change Level | Notes                                  |
|-----------------------------|-------------|----------------------------------------|
| `lib/billing/credits.ts`    | High        | Postgres functions for transactions    |
| `lib/billing/queries.ts`    | High        | All billing queries                    |
| `lib/billing/customer.ts`   | Medium      | Race condition handled via upsert      |
| `lib/billing/seat-sync.ts`  | High        | Advisory lock becomes Postgres function|
| `lib/billing/checkout.ts`   | None        | Pure Stripe SDK calls                  |
| `lib/billing/subscriptions.ts` | None     | Pure Stripe SDK calls                  |
| `lib/billing/guards.ts`     | Medium      | Queries change                         |
| `lib/billing/notifications.ts` | None     | Pure email sending                     |

---

## 9. Environment Variables

### Removed

```bash
# Database (Prisma)
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT
DATABASE_URL, DATABASE_SCHEMA

# Storage (S3/R2)
S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION
NEXT_PUBLIC_IMAGES_BUCKET_NAME

# Auth (Better Auth)
BETTER_AUTH_SECRET
```

### Added

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
```

### Unchanged

```bash
# Stripe
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PRICE_*

# Email
RESEND_API_KEY, EMAIL_FROM

# Google OAuth
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# AI
OPENAI_API_KEY

# Monitoring
SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN, NEXT_PUBLIC_SENTRY_DSN

# Turnstile
TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY

# App
NEXT_PUBLIC_SITE_URL
```

---

## 10. Migration Plan

### Phase 0: Supabase Setup (1 day)

1. `supabase init` in project root
2. Create `supabase/schemas/` with all 14 SQL files
3. Write SQL migrations derived from current Prisma schema
4. Configure env variables
5. `supabase start` and verify tables
6. Generate TypeScript types
7. Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`

### Phase 1: Supabase Clients + Proxy (1 day)

1. Create `lib/supabase/client.ts`, `server.ts`, `proxy.ts`, `admin.ts`
2. Create root `proxy.ts` (Next.js 16)
3. Generate `database.types.ts`
4. Verify all 3 clients work

### Phase 2: Auth Migration (3-4 days) - CRITICAL

1. Configure Supabase Auth (email/password, Google OAuth, MFA TOTP)
2. Create `handle_new_user()` trigger
3. Rewrite `lib/auth/server.ts` with `getClaims()`
4. Rewrite `lib/auth/client.ts`
5. Update `hooks/use-session.tsx`
6. Rewrite `trpc/init.ts` (all 4 procedure types)
7. Update auth pages (sign-in, sign-up, callback, confirm, verify)
8. Implement `activeOrganizationId` via cookie
9. Remove Better Auth files and dependencies

### Phase 3: Data Access Migration (3-4 days)

1. Migrate tRPC routers one at a time (user → org → lead → ai → credit → subscription → admin)
2. Create Postgres functions (deduct_credits, add_credits, sync_seats, list_ai_chats)
3. Migrate `app/api/ai/chat/route.ts`
4. Migrate billing query files
5. Migrate webhook handler (admin client)
6. Remove Prisma files and dependencies

### Phase 4: RLS (1-2 days)

1. Enable RLS on all tables
2. Create helper functions
3. Create policies for every table
4. Create protection triggers
5. Test cross-organization isolation

### Phase 5: Storage (1 day) - can run parallel with Phase 3

1. Create `images` bucket with RLS
2. Rewrite `lib/storage/`
3. Update upload components
4. Remove S3 files and dependencies

### Phase 6: Cleanup (1 day)

1. Remove all orphaned files and dependencies
2. Update `.env.example`
3. Update `package.json` scripts
4. Update documentation (README, CLAUDE.md, AGENTS.md)
5. `npm run lint && npm run typecheck`
6. Full end-to-end test

### Estimated Total: ~11-14 days

### Later Phases

| Phase | What                           | When                     |
|-------|--------------------------------|--------------------------|
| 7     | Billing re-integration         | Ready to monetize        |
| 8     | MFA enforcement (restrictive)  | When requiring MFA       |
| 9     | Impersonation                  | When needed for support  |
| 10    | Realtime notifications         | When needed              |

### Phase Dependencies

```
Phase 0 (Setup)
  └── Phase 1 (Clients)
        ├── Phase 2 (Auth) ← CRITICAL PATH
        │     └── Phase 3 (Data Access)
        │           └── Phase 4 (RLS)
        └── Phase 5 (Storage) ← can run parallel with Phase 3
              └── Phase 6 (Cleanup) ← after all phases complete
```

---

## 11. Risks and Mitigations

| Risk                                          | Impact | Mitigation                                                        |
|-----------------------------------------------|--------|-------------------------------------------------------------------|
| Email templates differ from React Email       | Medium | Supabase supports custom HTML. Non-auth emails stay on Resend     |
| Query performance Supabase client vs Prisma   | Low    | PostgREST is fast. Postgres functions for complex queries         |
| Type safety less granular without Prisma      | Medium | `database.types.ts` auto-generated covers all tables              |
| Advisory locks not available via Supabase JS  | Low    | Converted to `security definer` Postgres functions via `rpc()`    |
| Supabase free tier pauses after 1 week        | Low    | Dev only. Production: Pro plan ($25/mo)                           |
| Naming convention change (camelCase → snake)  | Low    | Mechanical find-and-replace, pervasive but simple                 |

---

## 12. Security Comparison

| Aspect                    | Before (Better Auth + Prisma) | After (Supabase Auth + RLS)         |
|---------------------------|-------------------------------|-------------------------------------|
| Multi-tenancy             | Application-only (WHERE)      | Database (RLS) + application        |
| Forgotten org filter      | **Data leak**                 | RLS blocks anyway                   |
| Direct DB access          | Sees everything               | RLS active for authenticated role   |
| Webhook/backend           | Same client as user           | Separate admin client (bypasses RLS)|
| MFA enforcement           | Application only              | Database (restrictive policies)     |
| Permission audit           | Read TypeScript code          | Read SQL policies                   |
| JWT verification           | Network call to auth server   | Local verification (getClaims)      |

---

## 13. Google OAuth Note

Google OAuth redirect URI must be updated when switching to Supabase:
- **Before (Better Auth):** `https://yourdomain.com/api/auth/callback/google`
- **After (Supabase):** `https://<project-ref>.supabase.co/auth/v1/callback`

Configure in Google Cloud Console > APIs & Credentials > OAuth 2.0 Client > Authorized redirect URIs.

Supabase handles the OAuth flow internally and redirects back to your app's `/auth/callback` route after authentication.

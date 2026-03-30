# Phase 3: Data Access Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all tRPC routers, billing layer files, AI chat route, and Stripe webhook handler from Prisma to Supabase client JS, then remove Prisma completely.
**Depends on:** Phase 2
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md`

---

## Quick Reference: Prisma to Supabase Query Patterns

These patterns apply across ALL tasks in this phase. Refer back to this section when converting each query.

### Column Name Convention

All camelCase column names become snake_case:

| Prisma (camelCase)   | Supabase (snake_case)     |
|----------------------|---------------------------|
| `organizationId`     | `organization_id`         |
| `firstName`          | `first_name`              |
| `lastName`           | `last_name`               |
| `createdAt`          | `created_at`              |
| `updatedAt`          | `updated_at`              |
| `balanceAfter`       | `balance_after`           |
| `lifetimePurchased`  | `lifetime_purchased`      |
| `lifetimeGranted`    | `lifetime_granted`        |
| `lifetimeUsed`       | `lifetime_used`           |
| `estimatedValue`     | `estimated_value`         |
| `jobTitle`           | `job_title`               |
| `assignedToId`       | `assigned_to_id`          |
| `stripeCustomerId`   | `stripe_customer_id`      |
| `stripePriceId`      | `stripe_price_id`         |
| `stripeProductId`    | `stripe_product_id`       |
| `cancelAtPeriodEnd`  | `cancel_at_period_end`    |
| `currentPeriodEnd`   | `current_period_end`      |
| `currentPeriodStart` | `current_period_start`    |
| `trialEnd`           | `trial_end`               |
| `trialStart`         | `trial_start`             |
| `canceledAt`         | `canceled_at`             |
| `referenceType`      | `reference_type`          |
| `referenceId`        | `reference_id`            |
| `inputTokens`        | `input_tokens`            |
| `outputTokens`       | `output_tokens`           |
| `billingInterval`    | `billing_interval`        |
| `intervalCount`      | `interval_count`          |
| `unitAmount`         | `unit_amount`             |
| `priceAmount`        | `price_amount`            |
| `priceType`          | `price_type`              |
| `priceModel`         | `price_model`             |
| `meterId`            | `meter_id`                |
| `stripeEventId`      | `stripe_event_id`         |
| `banReason`          | `ban_reason`              |
| `banExpires`         | `ban_expires`             |
| `onboardingComplete` | `onboarding_complete`     |
| `emailVerified`      | `email_verified`          |
| `twoFactorEnabled`   | `two_factor_enabled`      |
| `MemberRole`         | string literal `'owner'` / `'admin'` / `'member'` |

### Read Patterns

```typescript
// findFirst with WHERE
// Prisma:
prisma.lead.findFirst({ where: { id, organizationId } })
// Supabase:
ctx.supabase.from('lead').select('*').eq('id', id).eq('organization_id', orgId).single()

// findUnique
// Prisma:
prisma.organization.findUnique({ where: { id } })
// Supabase:
ctx.supabase.from('organization').select('*').eq('id', id).single()

// findMany with filters, sort, pagination
// Prisma:
prisma.lead.findMany({ where, take: 50, skip: offset, orderBy: { createdAt: 'desc' } })
// Supabase:
ctx.supabase.from('lead').select('*', { count: 'exact' })
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)

// count
// Prisma:
prisma.lead.count({ where })
// Supabase:
ctx.supabase.from('lead').select('*', { count: 'exact', head: true }).eq(...)
// count is returned in the response object

// findMany with IN
// Prisma:
prisma.lead.findMany({ where: { id: { in: ids } } })
// Supabase:
ctx.supabase.from('lead').select('*').in('id', ids)

// contains (case insensitive)
// Prisma:
{ firstName: { contains: query, mode: 'insensitive' } }
// Supabase:
.ilike('first_name', `%${query}%`)

// OR search across columns
// Prisma:
where.OR = [{ firstName: { contains: q } }, { email: { contains: q } }]
// Supabase:
.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)

// include/relation
// Prisma:
prisma.lead.findMany({ include: { assignedTo: { select: { id: true, name: true } } } })
// Supabase:
ctx.supabase.from('lead').select('*, assigned_to:user_profile!assigned_to_id(id, username)')

// _count
// Prisma:
prisma.organization.findMany({ include: { _count: { select: { members: true } } } })
// Supabase: use a separate count query or a database function
```

### Write Patterns

```typescript
// create
// Prisma:
prisma.lead.create({ data: { firstName, organizationId } })
// Supabase:
ctx.supabase.from('lead').insert({ first_name: firstName, organization_id: orgId }).select().single()

// update
// Prisma:
prisma.lead.update({ where: { id }, data: { status: 'qualified' } })
// Supabase:
ctx.supabase.from('lead').update({ status: 'qualified' }).eq('id', id).select().single()

// updateMany (atomic update with org check)
// Prisma:
prisma.lead.updateMany({ where: { id, organizationId }, data })
// Supabase:
ctx.supabase.from('lead').update(data).eq('id', id).eq('organization_id', orgId).select().single()

// delete
// Prisma:
prisma.lead.delete({ where: { id } })
// Supabase:
ctx.supabase.from('lead').delete().eq('id', id)

// deleteMany with IN
// Prisma:
prisma.lead.deleteMany({ where: { id: { in: ids }, organizationId } })
// Supabase:
ctx.supabase.from('lead').delete().in('id', ids).eq('organization_id', orgId)

// upsert
// Prisma:
prisma.creditBalance.upsert({ where: { organizationId }, create: {...}, update: {...} })
// Supabase:
ctx.supabase.from('credit_balance').upsert({ organization_id: orgId, balance: 0 }, { onConflict: 'organization_id' }).select().single()

// $transaction
// Prisma:
prisma.$transaction(async (tx) => { ... })
// Supabase:
supabase.rpc('function_name', { p_param1: value1, p_param2: value2 })
```

### Sort Mapping

```typescript
// Prisma:
orderBy: { createdAt: 'desc' }
// Supabase:
.order('created_at', { ascending: false })

// Sort field mapping for leads:
// 'name' -> 'first_name'
// 'company' -> 'company'
// 'email' -> 'email'
// 'status' -> 'status'
// 'source' -> 'source'
// 'estimatedValue' -> 'estimated_value'
// default -> 'created_at'
```

### Date Filter Pattern

```typescript
// Prisma:
{ createdAt: { gte: start, lt: end } }
// Supabase:
.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
```

### Admin vs User Client

- **User-facing routers** (org lead, ai, credit, subscription): use `ctx.supabase` (respects RLS)
- **Admin routers** (admin-user-router, admin-organization-router): use `createAdminClient()` from `lib/supabase/admin.ts` to bypass RLS
- **Webhook handler**: use `createAdminClient()` since webhooks have no user session

---

## Task 16: Migrate user and organization routers

### Files

- `trpc/routers/user/index.ts`
- `trpc/routers/organization/index.ts`

### Steps

- [ ] 1. **Migrate `trpc/routers/user/index.ts`**

  The user router currently calls Better Auth helpers (`getSession`, `getActiveSessions`, `getUserAccounts`). After Phase 2, these are already Supabase-based in `lib/auth/server.ts`. The router itself has no direct Prisma calls, so the changes here are minimal -- just verify imports match the new auth module signatures from Phase 2.

  ```typescript
  // user/index.ts - should already work after Phase 2
  // Verify getSession, getActiveSessions use getClaims() under the hood
  // getAccounts -> maps to supabase.auth.getUserIdentities() (done in Phase 2)
  ```

  If `getActiveSessions` no longer exists (Supabase doesn't expose session list), remove or stub it:
  ```typescript
  getActiveSessions: protectedProcedure.query(async () => {
    // Supabase manages sessions via JWT. No session list API.
    // Return empty array or the current session only.
    return [];
  }),
  ```

- [ ] 2. **Migrate `trpc/routers/organization/index.ts` - `list` procedure**

  Current Prisma:
  ```typescript
  prisma.organization.findMany({
    where: { members: { some: { userId: ctx.user.id } } },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true } } },
  });
  ```

  Supabase replacement -- since Supabase client does not support nested relation filters like `members: { some: { userId } }`, query via the member table:
  ```typescript
  // Step 1: Get org IDs where user is a member
  const { data: memberships } = await ctx.supabase
    .from('member')
    .select('organization_id')
    .eq('user_id', ctx.user.id);

  const orgIds = memberships?.map(m => m.organization_id) ?? [];

  if (orgIds.length === 0) return [];

  // Step 2: Get organizations
  const { data: organizations } = await ctx.supabase
    .from('organization')
    .select('*')
    .in('id', orgIds)
    .order('created_at', { ascending: true });

  // Step 3: Get member counts per org
  // Use a separate query or RPC function for counts
  const orgsWithCounts = await Promise.all(
    (organizations ?? []).map(async (org) => {
      const { count } = await ctx.supabase
        .from('member')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      return {
        ...org,
        slug: org.slug ?? '',
        membersCount: count ?? 0,
      };
    })
  );

  return orgsWithCounts;
  ```

- [ ] 3. **Migrate `organization/index.ts` - `get` procedure**

  Already handled by `assertUserIsOrgMember` which was migrated in Phase 2. Verify it returns the organization object.

- [ ] 4. **Migrate `organization/index.ts` - `create` procedure**

  Current code uses `auth.api.createOrganization()` (Better Auth). Replace with direct Supabase inserts:
  ```typescript
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = await generateOrganizationSlug(input.name);

      // Insert organization
      const { data: organization, error: orgError } = await ctx.supabase
        .from('organization')
        .insert({
          name: input.name,
          slug,
          metadata: input.metadata ?? null,
        })
        .select()
        .single();

      if (orgError || !organization) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create organization',
        });
      }

      // Add creator as owner
      const { error: memberError } = await ctx.supabase
        .from('member')
        .insert({
          organization_id: organization.id,
          user_id: ctx.user.id,
          role: 'owner',
        });

      if (memberError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add owner to organization',
        });
      }

      // Initialize credit balance
      try {
        await ctx.supabase
          .from('credit_balance')
          .upsert(
            { organization_id: organization.id, balance: 0 },
            { onConflict: 'organization_id' }
          );
      } catch (error) {
        logger.warn(
          { organizationId: organization.id, error },
          'Failed to initialize credit balance for new organization',
        );
      }

      return organization;
    }),
  ```

- [ ] 5. **Migrate `generateOrganizationSlug` helper**

  ```typescript
  async function generateOrganizationSlug(name: string): Promise<string> {
    const supabase = await createClient(); // server client
    const baseSlug = slugify(name, { lowercase: true });

    let slug = baseSlug;
    let hasAvailableSlug = false;

    for (let i = 0; i < 3; i++) {
      slug = `${baseSlug}-${nanoid(5)}`;

      const { data: existing } = await supabase
        .from('organization')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existing) {
        hasAvailableSlug = true;
        break;
      }
    }

    if (!hasAvailableSlug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No available slug found',
      });
    }

    return slug;
  }
  ```

- [ ] 6. **Remove Prisma imports** from both files (`import { prisma } from "@/lib/db"`, `import { auth } from "@/lib/auth"`).

- [ ] 7. **Commit**: `git commit -m "feat(task-16): migrate user and organization routers to Supabase"`

---

## Task 17: Migrate lead router

### Files

- `trpc/routers/organization/organization-lead-router.ts`

### Steps

- [ ] 1. **Remove Prisma imports** at the top of the file:
  ```typescript
  // REMOVE:
  import type { Prisma } from "@prisma/client";
  import { appendAnd, prisma } from "@/lib/db";
  ```

- [ ] 2. **Migrate `list` procedure**

  Current Prisma code builds a complex `where` object with optional search, status filter, source filter, date filter, sorting, and pagination. Convert to Supabase query builder:

  ```typescript
  list: protectedOrganizationProcedure
    .input(listLeadsSchema)
    .query(async ({ ctx, input }) => {
      // Map sort field
      const sortFieldMap: Record<string, string> = {
        name: 'first_name',
        company: 'company',
        email: 'email',
        status: 'status',
        source: 'source',
        estimatedValue: 'estimated_value',
      };
      const sortColumn = sortFieldMap[input.sortBy ?? ''] ?? 'created_at';
      const ascending = input.sortOrder !== 'desc';

      // Build query with count
      let query = ctx.supabase
        .from('lead')
        .select('*, assigned_to:user_profile!assigned_to_id(id, username)', { count: 'exact' })
        .eq('organization_id', ctx.organization.id)
        .order(sortColumn, { ascending })
        .range(input.offset, input.offset + input.limit - 1);

      // Search filter
      if (input.query) {
        const q = input.query;
        query = query.or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`
        );
      }

      // Status filter
      if (input.filters?.status && input.filters.status.length > 0) {
        query = query.in('status', input.filters.status);
      }

      // Source filter
      if (input.filters?.source && input.filters.source.length > 0) {
        query = query.in('source', input.filters.source);
      }

      // Date filters
      if (input.filters?.createdAt && input.filters.createdAt.length > 0) {
        const now = new Date();
        // Build date conditions - for multiple date ranges, use .or()
        // For simplicity, use the first matching range
        // NOTE: Supabase .or() can combine date conditions if needed
        for (const range of input.filters.createdAt) {
          switch (range) {
            case 'today': {
              const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
              break;
            }
            case 'this-week': {
              const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
              query = query.gte('created_at', weekStart.toISOString());
              break;
            }
            case 'this-month': {
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              query = query.gte('created_at', monthStart.toISOString());
              break;
            }
            case 'older': {
              const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
              query = query.lte('created_at', monthAgo.toISOString());
              break;
            }
          }
        }
      }

      const { data: leads, count, error } = await query;

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { leads: leads ?? [], total: count ?? 0 };
    }),
  ```

- [ ] 3. **Migrate `get` procedure**

  ```typescript
  get: protectedOrganizationProcedure
    .input(deleteLeadSchema)
    .query(async ({ ctx, input }) => {
      const { data: lead, error } = await ctx.supabase
        .from('lead')
        .select('*, assigned_to:user_profile!assigned_to_id(id, username)')
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .single();

      if (error || !lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return lead;
    }),
  ```

- [ ] 4. **Migrate `create` procedure**

  ```typescript
  create: protectedOrganizationProcedure
    .input(createLeadSchema)
    .mutation(async ({ ctx, input }) => {
      // Map camelCase input fields to snake_case
      const { data: lead, error } = await ctx.supabase
        .from('lead')
        .insert({
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          job_title: input.jobTitle,
          status: input.status,
          source: input.source,
          estimated_value: input.estimatedValue,
          notes: input.notes,
          assigned_to_id: input.assignedToId,
          organization_id: ctx.organization.id,
        })
        .select()
        .single();

      if (error || !lead) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create lead' });
      }

      return lead;
    }),
  ```

- [ ] 5. **Migrate `update` procedure**

  The current code uses `$transaction` with `updateMany` + `findUnique`. Supabase `.update().eq().eq().select().single()` is already atomic:

  ```typescript
  update: protectedOrganizationProcedure
    .input(updateLeadSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...inputData } = input;

      // Map camelCase to snake_case for the data payload
      const data: Record<string, unknown> = {};
      if (inputData.firstName !== undefined) data.first_name = inputData.firstName;
      if (inputData.lastName !== undefined) data.last_name = inputData.lastName;
      if (inputData.email !== undefined) data.email = inputData.email;
      if (inputData.phone !== undefined) data.phone = inputData.phone;
      if (inputData.company !== undefined) data.company = inputData.company;
      if (inputData.jobTitle !== undefined) data.job_title = inputData.jobTitle;
      if (inputData.status !== undefined) data.status = inputData.status;
      if (inputData.source !== undefined) data.source = inputData.source;
      if (inputData.estimatedValue !== undefined) data.estimated_value = inputData.estimatedValue;
      if (inputData.notes !== undefined) data.notes = inputData.notes;
      if (inputData.assignedToId !== undefined) data.assigned_to_id = inputData.assignedToId;

      const { data: updated, error } = await ctx.supabase
        .from('lead')
        .update(data)
        .eq('id', id)
        .eq('organization_id', ctx.organization.id)
        .select()
        .single();

      if (error || !updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return updated;
    }),
  ```

- [ ] 6. **Migrate `delete` procedure**

  ```typescript
  delete: protectedOrganizationProcedure
    .input(deleteLeadSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('lead')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .select('id')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }

      return { success: true };
    }),
  ```

- [ ] 7. **Migrate `bulkDelete` procedure**

  ```typescript
  bulkDelete: protectedOrganizationProcedure
    .input(bulkDeleteLeadsSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: deleted, error } = await ctx.supabase
        .from('lead')
        .delete()
        .in('id', input.ids)
        .eq('organization_id', ctx.organization.id)
        .select('id');

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { success: true, count: deleted?.length ?? 0 };
    }),
  ```

- [ ] 8. **Migrate `bulkUpdateStatus` procedure**

  ```typescript
  bulkUpdateStatus: protectedOrganizationProcedure
    .input(bulkUpdateLeadsStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: updated, error } = await ctx.supabase
        .from('lead')
        .update({ status: input.status })
        .in('id', input.ids)
        .eq('organization_id', ctx.organization.id)
        .select('id');

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { success: true, count: updated?.length ?? 0 };
    }),
  ```

- [ ] 9. **Migrate `exportSelectedToCsv` and `exportSelectedToExcel` procedures**

  ```typescript
  exportSelectedToCsv: protectedOrganizationProcedure
    .input(exportLeadsSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: leads } = await ctx.supabase
        .from('lead')
        .select('id, first_name, last_name, email, phone, company, job_title, status, source, estimated_value, notes, created_at, updated_at')
        .in('id', input.leadIds)
        .eq('organization_id', ctx.organization.id);

      const Papa = await import('papaparse');
      const csv = Papa.unparse(leads ?? []);
      return csv;
    }),
  ```

  Same pattern for `exportSelectedToExcel` -- update the column keys to snake_case and update the worksheet column definitions accordingly.

- [ ] 10. **Commit**: `git commit -m "feat(task-17): migrate lead router to Supabase"`

---

## Task 18: Migrate AI chat router and AI chat route

### Files

- `trpc/routers/organization/organization-ai-router.ts`
- `app/api/ai/chat/route.ts`

### Steps

- [ ] 1. **Migrate `listChats` procedure**

  The current code uses `prisma.$queryRaw` with a raw SQL query. Replace with the `list_ai_chats` Postgres function (created in Phase 0 schema files):

  ```typescript
  listChats: protectedOrganizationProcedure
    .input(/* same schema */)
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const { data: chats, error } = await ctx.supabase.rpc('list_ai_chats', {
        p_organization_id: ctx.organization.id,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { chats: chats ?? [] };
    }),
  ```

- [ ] 2. **Migrate `getChat` procedure**

  ```typescript
  getChat: protectedOrganizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: chat, error } = await ctx.supabase
        .from('ai_chat')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .single();

      if (error || !chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      return {
        chat: {
          ...chat,
          messages: chat.messages ? JSON.parse(chat.messages as string) : [],
        },
      };
    }),
  ```

- [ ] 3. **Migrate `createChat` procedure**

  ```typescript
  createChat: protectedOrganizationProcedure
    .input(z.object({ title: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { data: chat, error } = await ctx.supabase
        .from('ai_chat')
        .insert({
          organization_id: ctx.organization.id,
          user_id: ctx.user.id,
          title: input?.title ?? null,
          messages: JSON.stringify([]),
        })
        .select()
        .single();

      if (error || !chat) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create chat' });
      }

      return { chat: { ...chat, messages: [] } };
    }),
  ```

- [ ] 4. **Migrate `updateChat` procedure**

  ```typescript
  updateChat: protectedOrganizationProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().max(200).optional(),
      messages: z.array(chatMessageSchema).max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Build update data
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.messages !== undefined) updateData.messages = JSON.stringify(input.messages);

      const { data: updated, error } = await ctx.supabase
        .from('ai_chat')
        .update(updateData)
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .select()
        .single();

      if (error || !updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      return {
        chat: {
          ...updated,
          messages: updated.messages ? JSON.parse(updated.messages as string) : [],
        },
      };
    }),
  ```

- [ ] 5. **Migrate `deleteChat` procedure**

  ```typescript
  deleteChat: protectedOrganizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('ai_chat')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .select('id')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      return { success: true };
    }),
  ```

- [ ] 6. **Migrate `togglePin` procedure**

  ```typescript
  togglePin: protectedOrganizationProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch current pin state
      const { data: existing, error: fetchError } = await ctx.supabase
        .from('ai_chat')
        .select('id, pinned')
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      // Toggle
      const { data: updated, error } = await ctx.supabase
        .from('ai_chat')
        .update({ pinned: !existing.pinned })
        .eq('id', input.id)
        .eq('organization_id', ctx.organization.id)
        .select()
        .single();

      if (error || !updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat not found' });
      }

      return { chat: updated, pinned: updated.pinned };
    }),
  ```

- [ ] 7. **Migrate `searchChats` procedure**

  ```typescript
  searchChats: protectedOrganizationProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(appConfig.pagination.maxLimit).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Use .or() for title and message content search
      const { data: chats, error } = await ctx.supabase
        .from('ai_chat')
        .select('id, title, pinned, created_at, messages')
        .eq('organization_id', ctx.organization.id)
        .or(`title.ilike.%${input.query}%,messages.ilike.%${input.query}%`)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      // Extract first message content from results
      const shaped = (chats ?? []).map(chat => {
        let firstMessageContent: string | null = null;
        if (chat.messages) {
          try {
            const msgs = JSON.parse(chat.messages as string);
            if (Array.isArray(msgs) && msgs.length > 0) {
              firstMessageContent = msgs[0]?.content ?? null;
            }
          } catch { /* ignore parse errors */ }
        }
        return {
          id: chat.id,
          title: chat.title,
          pinned: chat.pinned,
          created_at: chat.created_at,
          first_message_content: firstMessageContent,
        };
      });

      return { chats: shaped };
    }),
  ```

- [ ] 8. **Migrate `app/api/ai/chat/route.ts`**

  Replace `import { prisma } from "@/lib/db"` with Supabase server client. The AI chat route needs to:
  - Create a Supabase server client (not admin -- user session needed for RLS)
  - Replace all `prisma.aiChat.*` calls with Supabase equivalents
  - Use `supabase.rpc('deduct_credits', ...)` for credit deduction (this is handled by the credits module, see Task 21)

  Key changes in the route:
  ```typescript
  // Replace:
  import { prisma } from "@/lib/db";
  // With:
  import { createClient } from "@/lib/supabase/server";

  // In the POST handler:
  const supabase = await createClient();

  // Replace prisma.aiChat.findFirst:
  const { data: chat } = await supabase
    .from('ai_chat')
    .select('*')
    .eq('id', chatId)
    .eq('organization_id', organizationId)
    .single();

  // Replace prisma.aiChat.update for saving messages:
  await supabase
    .from('ai_chat')
    .update({ messages: JSON.stringify(newMessages), title: generatedTitle })
    .eq('id', chatId)
    .eq('organization_id', organizationId);
  ```

- [ ] 9. **Remove Prisma imports** from both files.

- [ ] 10. **Commit**: `git commit -m "feat(task-18): migrate AI chat router and route to Supabase"`

---

## Task 19: Migrate credit and subscription routers

### Files

- `trpc/routers/organization/organization-credit-router.ts`
- `trpc/routers/organization/organization-subscription-router.ts`

### Steps

- [ ] 1. **Migrate `organization-credit-router.ts`**

  The credit router mostly delegates to `lib/billing/credits.ts` functions (migrated in Task 21). Key changes:
  - Remove `import { prisma } from "@/lib/db"`
  - Remove `import { MemberRole } from "@prisma/client"`
  - Replace `MemberRole.owner` / `MemberRole.admin` with string literals `'owner'` / `'admin'`
  - The `getTransactions` procedure has a direct `prisma.creditTransaction.count()` call -- replace:

  ```typescript
  getTransactions: protectedOrganizationProcedure
    .input(getOrganizationCreditTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const { count: total } = await ctx.supabase
        .from('credit_transaction')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.organization.id);

      const transactions = await listCreditTransactions(ctx.organization.id, {
        limit: input.limit,
        offset: input.offset,
      });

      return {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: tx.balance_after,
          description: tx.description,
          model: tx.model,
          createdAt: tx.created_at,
        })),
        total: total ?? 0,
        hasMore: (input.offset ?? 0) + transactions.length < (total ?? 0),
      };
    }),
  ```

  Note: field names in the `transactions.map()` return change from camelCase to snake_case since the data now comes from Supabase. If the frontend expects camelCase, either add a mapping layer or update the frontend.

- [ ] 2. **Migrate `organization-subscription-router.ts`**

  - Remove `import { prisma } from "@/lib/db"`
  - Replace the `getOrganizationWithBilling` helper:

  ```typescript
  async function getOrganizationWithBilling(organizationId: string, supabase: SupabaseClient) {
    const { data } = await supabase
      .from('organization')
      .select('id, name, stripe_customer_id')
      .eq('id', organizationId)
      .single();
    return data;
  }
  ```

  - Replace `prisma.member.count()` calls (in `createCheckout`, `updateSeats`, `getSeatInfo`):

  ```typescript
  // Replace:
  const memberCount = await prisma.member.count({
    where: { organizationId: organization.id },
  });
  // With:
  const { count: memberCount } = await ctx.supabase
    .from('member')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organization.id);
  ```

  - Pass `ctx.supabase` to `getOrganizationWithBilling` calls.

- [ ] 3. **Commit**: `git commit -m "feat(task-19): migrate credit and subscription routers to Supabase"`

---

## Task 20: Migrate admin routers

### Files

- `trpc/routers/admin/admin-user-router.ts`
- `trpc/routers/admin/admin-organization-router.ts`

### Important

Admin routers use `createAdminClient()` to bypass RLS since they need to access data across all organizations and users.

### Steps

- [ ] 1. **Migrate `admin-user-router.ts` - `list` procedure**

  Replace Prisma imports:
  ```typescript
  // REMOVE:
  import type { Prisma } from "@prisma/client";
  import { appendAnd, prisma } from "@/lib/db";
  // ADD:
  import { createAdminClient } from "@/lib/supabase/admin";
  ```

  The list procedure builds complex WHERE conditions. With Supabase admin client:

  ```typescript
  list: protectedAdminProcedure
    .input(listUsersAdminSchema)
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      // Build query - admin client bypasses RLS
      // Note: user_profile replaces the old User table
      // Auth data (email, email_verified) comes from auth.users
      // We need to join or use a view. Best approach: create a database view
      // or query auth.admin.listUsers() + user_profile separately.

      // Option: Use admin auth API for user listing
      // supabase.auth.admin.listUsers() returns auth users
      // Then join with user_profile for custom fields

      // For search/filter, build Supabase query on user_profile
      let query = supabase
        .from('user_profile')
        .select('*', { count: 'exact' });

      // Search by username (name equivalent)
      if (input.query) {
        query = query.or(
          `username.ilike.%${input.query}%`
        );
      }

      // Role filter
      if (input.filters?.role?.length) {
        query = query.in('role', input.filters.role);
      }

      // Banned filter
      if (input.filters?.banned?.length) {
        const conditions: string[] = [];
        for (const status of input.filters.banned) {
          if (status === 'banned') conditions.push('banned.eq.true');
          if (status === 'active') conditions.push('banned.eq.false');
        }
        if (conditions.length) {
          query = query.or(conditions.join(','));
        }
      }

      // Sort
      const sortFieldMap: Record<string, string> = {
        name: 'username',
        role: 'role',
      };
      const sortColumn = sortFieldMap[input.sortBy ?? ''] ?? 'created_at';
      const ascending = input.sortOrder !== 'desc';
      query = query.order(sortColumn, { ascending });

      // Pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data: users, count: total, error } = await query;

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { users: users ?? [], total: total ?? 0 };
    }),
  ```

  Note: The admin user list may need to combine `auth.users` data (email, email_verified) with `user_profile` data. Consider creating a database view `admin_user_view` that joins these, or use `supabase.auth.admin.listUsers()` and merge with profile data.

- [ ] 2. **Migrate `banUser` and `unbanUser` procedures**

  ```typescript
  banUser: protectedAdminProcedure
    .input(banUserAdminSchema)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      // Check if user exists
      const { data: targetUser, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', input.userId)
        .single();

      if (error || !targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      if (targetUser.id === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot ban yourself' });
      }

      if (targetUser.banned) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is already banned' });
      }

      await supabase
        .from('user_profile')
        .update({
          banned: true,
          ban_reason: input.reason,
          ban_expires: input.expiresAt || null,
        })
        .eq('id', input.userId);

      logger.info(
        { action: 'user_banned', targetUserId: input.userId, adminUserId: ctx.user.id, reason: input.reason },
        'Admin banned user',
      );
    }),
  ```

  Same pattern for `unbanUser` -- use admin client, snake_case columns.

- [ ] 3. **Migrate `admin-organization-router.ts` - `list` procedure**

  This is the most complex admin query. It includes related subscriptions, credit balance, member counts, and pending invitations. With Supabase admin client:

  ```typescript
  list: protectedAdminProcedure
    .input(listOrganizationsAdminSchema)
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      let query = supabase
        .from('organization')
        .select('*', { count: 'exact' });

      // Search
      if (input.query) {
        query = query.ilike('name', `%${input.query}%`);
      }

      // Date filters
      if (input.filters?.createdAt?.length) {
        const now = new Date();
        for (const range of input.filters.createdAt) {
          switch (range) {
            case 'today': {
              const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
              break;
            }
            // ... other date ranges same pattern
          }
        }
      }

      // Sort and paginate
      const sortColumn = input.sortBy === 'name' ? 'name' : 'created_at';
      const ascending = input.sortOrder !== 'desc';
      query = query.order(sortColumn, { ascending }).range(input.offset, input.offset + input.limit - 1);

      const { data: organizations, count: total, error } = await query;

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      // Fetch related data for each org
      const orgIds = (organizations ?? []).map(o => o.id);

      // Get member counts, subscriptions, credit balances in parallel
      const [memberCounts, subscriptions, creditBalances, pendingInvites] = await Promise.all([
        // Member counts per org
        Promise.all(orgIds.map(async (orgId) => {
          const { count } = await supabase.from('member').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
          return { orgId, count: count ?? 0 };
        })),
        // Latest subscription per org
        supabase.from('subscription').select('id, organization_id, status, stripe_price_id, trial_end, cancel_at_period_end').in('organization_id', orgIds).order('created_at', { ascending: false }),
        // Credit balances
        supabase.from('credit_balance').select('organization_id, balance').in('organization_id', orgIds),
        // Pending invitations
        supabase.from('invitation').select('organization_id', { count: 'exact' }).in('organization_id', orgIds).eq('status', 'pending'),
      ]);

      // Build lookup maps
      const memberCountMap = new Map(memberCounts.map(m => [m.orgId, m.count]));
      // ... build other maps and shape the response

      return { organizations: shaped, total: total ?? 0 };
    }),
  ```

- [ ] 4. **Migrate `delete` procedure**

  ```typescript
  delete: protectedAdminProcedure
    .input(deleteOrganizationAdminSchema)
    .mutation(async ({ input }) => {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('organization')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),
  ```

- [ ] 5. **Migrate `adjustCredits` procedure** -- uses `adjustCreditsLib` which is migrated in Task 21. Just update the org existence check:

  ```typescript
  // Replace:
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  // With:
  const supabase = createAdminClient();
  const { data: org } = await supabase
    .from('organization')
    .select('id')
    .eq('id', input.organizationId)
    .single();
  ```

- [ ] 6. **Migrate export procedures** -- same pattern as leads: replace `prisma.user.findMany` / `prisma.organization.findMany` with admin Supabase queries.

- [ ] 7. **Remove all Prisma imports** from both files.

- [ ] 8. **Commit**: `git commit -m "feat(task-20): migrate admin routers to Supabase"`

---

## Task 21: Migrate billing layer files

### Files

- `lib/billing/credits.ts`
- `lib/billing/queries.ts`
- `lib/billing/customer.ts`
- `lib/billing/seat-sync.ts`
- `lib/billing/guards.ts`
- `app/api/webhooks/stripe/route.ts`

### Steps

- [ ] 1. **Migrate `lib/billing/credits.ts`**

  Remove all Prisma imports:
  ```typescript
  // REMOVE:
  import type { CreditBalance, CreditDeductionFailure, CreditTransaction, Prisma } from "@prisma/client";
  import { CreditTransactionType } from "@prisma/client";
  import { prisma } from "@/lib/db";
  // ADD:
  import { createAdminClient } from "@/lib/supabase/admin";
  ```

  **`getCreditBalance`** -- replace upsert:
  ```typescript
  export async function getCreditBalance(organizationId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('credit_balance')
      .upsert(
        { organization_id: organizationId, balance: 0 },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();
    return data!;
  }
  ```

  **`addCredits`** -- replace `$transaction` with `supabase.rpc('add_credits', ...)`:
  ```typescript
  export async function addCredits(params: { ... }): Promise<CreditTransactionSelect> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('add_credits', {
      p_organization_id: params.organizationId,
      p_amount: params.amount,
      p_type: params.type,
      p_description: sanitizeDescription(params.description),
      p_reference_type: params.referenceType ?? null,
      p_reference_id: params.referenceId ?? null,
      p_created_by: params.createdBy ?? null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });

    if (error) throw new CreditBalanceError(error.message);
    return data;
  }
  ```

  Note: This requires creating an `add_credits` Postgres function in the schema (similar to `deduct_credits` in the spec). Alternatively, use multiple Supabase queries (not transactional but simpler).

  **`consumeCredits`** -- replace with `supabase.rpc('deduct_credits', ...)`:
  ```typescript
  export async function consumeCredits(params: { ... }) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_organization_id: params.organizationId,
      p_amount: params.amount,
      p_description: sanitizeDescription(params.description),
      p_model: params.model ?? null,
    });

    if (error) {
      if (error.message.includes('Insufficient credits')) {
        const balance = await getCreditBalance(params.organizationId);
        throw new InsufficientCreditsError(balance.balance, params.amount);
      }
      throw new CreditBalanceError(error.message);
    }

    return { transaction: data, remainingBalance: data.balance };
  }
  ```

  **`listCreditTransactions`**:
  ```typescript
  export async function listCreditTransactions(organizationId: string, options?: { ... }) {
    const supabase = createAdminClient();
    let query = supabase
      .from('credit_transaction')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50) - 1);

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    const { data } = await query;
    return data ?? [];
  }
  ```

  **`logFailedDeduction`**:
  ```typescript
  export async function logFailedDeduction(params: { ... }): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('credit_deduction_failure').insert({
        organization_id: params.organizationId,
        amount: params.amount,
        error_code: params.errorCode,
        error_message: params.errorMessage,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        user_id: params.userId,
      });
    } catch (error) {
      logger.error({ error, organizationId: params.organizationId }, 'Failed to log credit deduction failure');
    }
  }
  ```

  Convert remaining functions (`reverseCredits`, `adjustCredits`, `getUnresolvedDeductionFailures`, `resolveDeductionFailure`) following the same patterns.

- [ ] 2. **Migrate `lib/billing/queries.ts`**

  This is the largest file. Replace all Prisma operations with Supabase admin client calls.

  Remove:
  ```typescript
  import type { BillingEvent, Order, OrderItem, PrismaClient, Subscription, SubscriptionItem } from "@prisma/client";
  import { ... Prisma, ... } from "@prisma/client";
  import { prisma } from "@/lib/db";
  ```

  Add:
  ```typescript
  import { createAdminClient } from "@/lib/supabase/admin";
  ```

  Key conversions:

  **`createSubscription`** (upsert pattern):
  ```typescript
  export async function createSubscription(data: SubscriptionInsert) {
    const supabase = createAdminClient();
    const { data: result, error } = await supabase
      .from('subscription')
      .upsert(data, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return result;
  }
  ```

  **`updateSubscription`**:
  ```typescript
  export async function updateSubscription(id: string, data: Partial<SubscriptionInsert>) {
    const supabase = createAdminClient();
    const { data: result, error } = await supabase
      .from('subscription')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error?.code === 'PGRST116') return null; // not found
    if (error) throw error;
    return result;
  }
  ```

  **`getActiveSubscriptionByOrganizationId`**:
  ```typescript
  export async function getActiveSubscriptionByOrganizationId(organizationId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('subscription')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }
  ```

  **`syncSubscriptionItems`** (transaction replacement):
  ```typescript
  export async function syncSubscriptionItems(subscriptionId: string, items: SubscriptionItemInsert[]) {
    const supabase = createAdminClient();
    // Delete existing items
    await supabase.from('subscription_item').delete().eq('subscription_id', subscriptionId);
    // Insert new items
    if (items.length === 0) return [];
    const { data } = await supabase.from('subscription_item').insert(items).select();
    return data ?? [];
  }
  ```

  **`getLifetimeOrderByOrganizationId`**:
  ```typescript
  export async function getLifetimeOrderByOrganizationId(organizationId: string) {
    const supabase = createAdminClient();
    const { data: orders } = await supabase
      .from('order')
      .select('*, items:order_item(*)')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    for (const order of orders ?? []) {
      for (const item of order.items ?? []) {
        const plan = getPlanByStripePriceId(item.stripe_price_id);
        if (plan?.id === 'lifetime') {
          const { items: _, ...orderWithoutItems } = order;
          return { order: orderWithoutItems, stripePriceId: item.stripe_price_id };
        }
      }
    }
    return null;
  }
  ```

  **`billingEventExists`** and **`upsertBillingEvent`**:
  ```typescript
  export async function billingEventExists(stripeEventId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('billing_event')
      .select('id')
      .eq('stripe_event_id', stripeEventId)
      .maybeSingle();
    return !!data;
  }
  ```

  Convert all remaining query functions following the same patterns. Remember to use snake_case column names throughout.

- [ ] 3. **Migrate `lib/billing/customer.ts`**

  Replace Prisma calls with admin client:

  ```typescript
  // Replace:
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });
  // With:
  const supabase = createAdminClient();
  const { data: organization } = await supabase
    .from('organization')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single();
  ```

  **Atomic update for race condition prevention**:
  ```typescript
  // Replace:
  const updated = await prisma.organization.updateMany({
    where: { id: organizationId, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  // With:
  const { data: updated } = await supabase
    .from('organization')
    .update({ stripe_customer_id: customer.id })
    .eq('id', organizationId)
    .is('stripe_customer_id', null)
    .select('id');

  if (!updated || updated.length === 0) {
    // Another concurrent request already set a customer ID
    // ...
  }
  ```

  **`getOrganizationByStripeCustomerId`**:
  ```typescript
  export async function getOrganizationByStripeCustomerId(stripeCustomerId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('organization')
      .select('id, name, slug')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    return data;
  }
  ```

- [ ] 4. **Migrate `lib/billing/seat-sync.ts`**

  Replace the advisory lock pattern with the `sync_organization_seats` Postgres function:

  ```typescript
  export async function syncOrganizationSeats(
    organizationId: string,
    options: { skipIfLocked?: boolean } = {},
  ) {
    const supabase = createAdminClient();

    // Call the Postgres function that handles locking internally
    const { data, error } = await supabase.rpc('sync_organization_seats', {
      p_organization_id: organizationId,
    });

    if (error) {
      logger.error({ organizationId, error: error.message }, 'Error during seat sync');
      throw new Error(error.message);
    }

    // The function returns { skipped, reason } or { updated, subscription_id, old_quantity, new_quantity }
    if (data.skipped) {
      return {
        synced: false,
        previousSeats: 0,
        newSeats: 0,
        message: data.reason,
      };
    }

    if (data.updated) {
      // The DB quantity is updated. Now update Stripe (source of truth for billing).
      try {
        await updateSubscriptionQuantity(data.subscription_id, data.new_quantity);
      } catch (stripeError) {
        logger.error({ organizationId, error: stripeError }, 'Failed to update Stripe after seat sync');
        throw stripeError;
      }

      return {
        synced: true,
        previousSeats: data.old_quantity,
        newSeats: data.new_quantity,
        message: `Updated from ${data.old_quantity} to ${data.new_quantity} seats`,
      };
    }

    return { synced: false, previousSeats: 0, newSeats: 0, message: 'Unknown result' };
  }
  ```

  The `checkSeatSyncNeeded` and `getMinimumRequiredSeats` functions:
  ```typescript
  export async function checkSeatSyncNeeded(organizationId: string) {
    const supabase = createAdminClient();
    // ... replace prisma.member.count with supabase count query
    const { count: memberCount } = await supabase
      .from('member')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    // ... rest of logic unchanged
  }
  ```

- [ ] 5. **Migrate `lib/billing/guards.ts`**

  This file mostly delegates to `queries.ts` functions. No direct Prisma usage except through imported functions. Verify imports are correct after queries.ts migration. The only change needed:
  - Remove `import { SubscriptionStatus } from "@prisma/client"` -- define status constants locally or import from a shared types file
  - Define subscription status strings:
  ```typescript
  const SubscriptionStatus = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    incomplete: 'incomplete',
    // ... etc
  } as const;
  ```

- [ ] 6. **Migrate `app/api/webhooks/stripe/route.ts`**

  The webhook handler uses admin client since it has no user session:

  ```typescript
  // REMOVE:
  import { CreditTransactionType, OrderStatus, Prisma, SubscriptionStatus } from "@prisma/client";
  import { prisma } from "@/lib/db";

  // ADD:
  import { createAdminClient } from "@/lib/supabase/admin";

  // Replace isUniqueConstraintError:
  function isUniqueConstraintError(error: unknown): boolean {
    // Supabase/PostgREST returns error code '23505' for unique violations
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    );
  }

  // In the handler:
  const supabase = createAdminClient();

  // Replace idempotency check:
  const exists = await billingEventExists(event.id);
  // (billingEventExists already migrated in queries.ts)
  ```

  All the direct `prisma.*` calls in the webhook handler are already abstracted through `lib/billing` functions (`createSubscription`, `updateSubscription`, `createOrder`, `addCredits`, etc.) which are migrated in steps 1-4 above. Verify there are no remaining direct `prisma` calls.

  Replace any remaining direct calls like:
  ```typescript
  // Replace:
  await prisma.organization.update({ where: { id }, data: { stripeCustomerId } });
  // With:
  await supabase.from('organization').update({ stripe_customer_id: stripeCustomerId }).eq('id', id);
  ```

  Replace string enum imports:
  ```typescript
  // REMOVE: import { CreditTransactionType, OrderStatus, SubscriptionStatus } from "@prisma/client";
  // Use string literals: 'purchase', 'completed', 'active', etc.
  ```

- [ ] 7. **Commit**: `git commit -m "feat(task-21): migrate billing layer and webhook handler to Supabase"`

---

## Task 22: Remove Prisma completely

### Files to delete

- `lib/db/prisma.ts`
- `lib/db/prisma-where.ts`
- `lib/db/index.ts` (or `lib/db/client.ts`)
- `prisma/schema.prisma`
- `prisma/migrations/` (entire directory)
- `prisma.config.ts`

### Steps

- [ ] 1. **Search for any remaining Prisma imports** across the codebase:
  ```bash
  grep -r "from.*@prisma" --include="*.ts" --include="*.tsx" .
  grep -r "from.*lib/db" --include="*.ts" --include="*.tsx" .
  grep -r "prisma\." --include="*.ts" --include="*.tsx" .
  ```

  Fix any remaining references found.

- [ ] 2. **Delete Prisma files**:
  ```bash
  rm -f lib/db/prisma.ts lib/db/prisma-where.ts lib/db/index.ts lib/db/client.ts
  rm -f prisma.config.ts
  rm -rf prisma/
  rmdir lib/db 2>/dev/null || true
  ```

- [ ] 3. **Remove Prisma dependencies**:
  ```bash
  npm uninstall @prisma/client @prisma/adapter-pg prisma pg
  ```

- [ ] 4. **Remove Prisma-related scripts from `package.json`**:
  Remove or update these scripts:
  - `db:migrate` (was `prisma migrate dev`)
  - `db:generate` (was `prisma generate`)
  - `db:studio` (was `prisma studio`)
  - `postinstall` if it runs `prisma generate`

- [ ] 5. **Verify no TypeScript errors**:
  ```bash
  npm run typecheck
  ```

- [ ] 6. **Verify lint passes**:
  ```bash
  npm run lint
  ```

- [ ] 7. **Commit**: `git commit -m "feat(task-22): remove Prisma ORM completely"`

---

## Verification Checklist

After completing all tasks in this phase:

- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes
- [ ] No imports from `@prisma/client` remain
- [ ] No imports from `@/lib/db` remain
- [ ] No references to `prisma.` remain in application code
- [ ] All tRPC procedures return data in the expected format (check frontend compatibility)
- [ ] The `prisma/` directory is deleted
- [ ] Prisma packages are removed from `package.json`

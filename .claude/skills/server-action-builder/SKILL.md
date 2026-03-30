---
name: server-action-builder
description: Create tRPC procedures (queries and mutations) with Zod validation, proper authentication, feature guards, and Supabase integration. Use when implementing API endpoints, CRUD operations, or data fetching that needs authentication and validation. Invoke with /server-action-builder.
---

# tRPC Procedure Builder

You are an expert at creating type-safe tRPC procedures for this project following established patterns.

## Workflow

When asked to create a tRPC procedure, follow these steps:

### Step 1: Create Zod Schema

Create validation schema in `schemas/`:

```typescript
// schemas/feature-schemas.ts
import { z } from "zod";
import { FeatureStatus } from "@/lib/enums";

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio").max(255),
  description: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(FeatureStatus).default(FeatureStatus.draft),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;

export const updateFeatureSchema = createFeatureSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

### Step 2: Create tRPC Router

Create router in `trpc/routers/`:

```typescript
// trpc/routers/organization/feature-router.ts
import { TRPCError } from "@trpc/server";

import { logger } from "@/lib/logger";
import {
  createFeatureSchema,
  updateFeatureSchema,
} from "@/schemas/feature-schemas";
import {
  createTRPCRouter,
  featureGuard,
  protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationFeatureRouter = createTRPCRouter({
  list: protectedOrganizationProcedure
    .use(featureGuard("leads")) // if behind a feature flag
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("feature")
        .select("*")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error({ error }, "Failed to list features");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return data;
    }),

  create: protectedOrganizationProcedure
    .use(featureGuard("leads"))
    .input(createFeatureSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("feature")
        .insert({
          organization_id: ctx.organization.id,
          name: input.name,
          description: input.description,
          status: input.status,
        })
        .select()
        .single();

      if (error) {
        logger.error({ error }, "Failed to create feature");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      logger.info(
        { featureId: data.id, userId: ctx.user.id },
        "Feature created"
      );

      return data;
    }),

  update: protectedOrganizationProcedure
    .use(featureGuard("leads"))
    .input(updateFeatureSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Map camelCase input to snake_case DB columns
      const { data, error } = await ctx.supabase
        .from("feature")
        .update({
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.description !== undefined && {
            description: updates.description,
          }),
          ...(updates.status !== undefined && { status: updates.status }),
        })
        .eq("id", id)
        .eq("organization_id", ctx.organization.id)
        .select()
        .single();

      if (error) {
        logger.error({ error, featureId: id }, "Failed to update feature");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return data;
    }),

  delete: protectedOrganizationProcedure
    .use(featureGuard("leads"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check role for destructive operations
      if (
        ctx.membership.role !== "owner" &&
        ctx.membership.role !== "admin"
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { error } = await ctx.supabase
        .from("feature")
        .delete()
        .eq("id", input.id)
        .eq("organization_id", ctx.organization.id);

      if (error) {
        logger.error({ error, featureId: input.id }, "Failed to delete feature");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      logger.info(
        { featureId: input.id, userId: ctx.user.id },
        "Feature deleted"
      );

      return { success: true };
    }),
});
```

### Step 3: Register Router

Add to parent router:

```typescript
// trpc/routers/organization/index.ts
import { organizationFeatureRouter } from "./feature-router";

export const organizationRouter = createTRPCRouter({
  // ... existing routers
  feature: organizationFeatureRouter,
});
```

## Key Patterns

1. **Use the right procedure type**:
   - `publicProcedure` — no auth
   - `protectedProcedure` — requires login (ctx.user, ctx.supabase)
   - `protectedAdminProcedure` — requires platform admin
   - `protectedOrganizationProcedure` — requires org membership (ctx.organization, ctx.membership)

2. **Feature guards**: Chain `.use(featureGuard("featureName"))` for feature-flagged endpoints

3. **Always filter by organization_id**: Use `ctx.organization.id` for org-scoped data

4. **Use ctx.supabase**: The context's Supabase client carries the user's JWT — RLS enforces access

5. **Map camelCase → snake_case**: Zod schemas use camelCase, DB uses snake_case

6. **Logging**: Use `logger` from `@/lib/logger` — object first, message second

7. **Error handling**: Throw `TRPCError` with appropriate codes (NOT_FOUND, FORBIDDEN, INTERNAL_SERVER_ERROR)

8. **Role checks**: Use `ctx.membership.role` for org-level authorization beyond what RLS provides

## File Structure

```
schemas/
└── feature-schemas.ts              # Zod schemas + types
trpc/routers/
├── app.ts                          # Root router (lazy imports)
└── organization/
    ├── index.ts                    # Org sub-router composition
    └── feature-router.ts           # Feature procedures
```

## Anti-Patterns

```typescript
// ❌ BAD: Using adminClient for user queries (bypasses RLS)
const { data } = await adminClient.from("feature").select("*");

// ❌ BAD: Missing organization_id filter
const { data } = await ctx.supabase.from("feature").select("*");

// ❌ BAD: Using console.log
console.log("Feature created");

// ❌ BAD: Using any types
const data: any = await ctx.supabase.from("feature").select("*");

// ❌ BAD: camelCase column names in DB queries
.insert({ organizationId: ctx.organization.id }) // should be organization_id
```

## Reference

See `[Examples](examples.md)` for real patterns from the codebase.
See `[Reference](reference.md)` for tRPC procedure types and Supabase client APIs.

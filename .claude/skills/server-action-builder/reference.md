# tRPC Procedure Reference

## Procedure Types

```typescript
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  protectedAdminProcedure,
  protectedOrganizationProcedure,
  featureGuard,
} from "@/trpc/init";
```

### publicProcedure

No authentication. Context has `userAgent`, `ip`, `requestId`.

### protectedProcedure

Requires login. Context adds:

| Field | Type | Description |
|-------|------|-------------|
| `ctx.user` | `{ id, email, role, name, image }` | Authenticated user |
| `ctx.supabase` | `SupabaseClient` | Client with user's JWT (RLS-enforced) |
| `ctx.claims` | `JWTClaims` | Raw JWT claims |
| `ctx.profile` | `user_profile` | User profile row |

### protectedAdminProcedure

Requires platform admin (`ctx.profile.role === 'admin'`). Same context as `protectedProcedure`.

### protectedOrganizationProcedure

Requires org membership. Context adds:

| Field | Type | Description |
|-------|------|-------------|
| `ctx.organization` | `organization` | Active organization row |
| `ctx.membership` | `{ role, id }` | User's membership (role: owner/admin/member) |

### featureGuard

Middleware that blocks the procedure if a feature flag is disabled:

```typescript
.use(featureGuard("leads"))
.use(featureGuard("billing"))
.use(featureGuard("aiChatbot"))
```

## Supabase Client Patterns

### Query (RLS-enforced via ctx.supabase)

```typescript
// ✅ CORRECT: Use ctx.supabase (carries user JWT)
const { data, error } = await ctx.supabase
  .from("feature")
  .select("*")
  .eq("organization_id", ctx.organization.id)
  .order("created_at", { ascending: false });

// ❌ WRONG: Never use adminClient for user-facing queries
const { data } = await adminClient.from("feature").select("*");
```

### Insert + Select

```typescript
const { data, error } = await ctx.supabase
  .from("feature")
  .insert({
    organization_id: ctx.organization.id,
    name: input.name,
  })
  .select()
  .single();
```

**Gotcha**: `.insert().select().single()` requires BOTH INSERT and SELECT RLS policies to pass. If this fails, use a SECURITY DEFINER function.

### Update

```typescript
const { data, error } = await ctx.supabase
  .from("feature")
  .update({ name: input.name })
  .eq("id", input.id)
  .eq("organization_id", ctx.organization.id)
  .select()
  .single();
```

### Delete

```typescript
const { error } = await ctx.supabase
  .from("feature")
  .delete()
  .eq("id", input.id)
  .eq("organization_id", ctx.organization.id);
```

### Bulk Operations

```typescript
// Bulk delete
const { error } = await ctx.supabase
  .from("feature")
  .delete()
  .in("id", input.ids)
  .eq("organization_id", ctx.organization.id);

// Bulk update
const { error } = await ctx.supabase
  .from("feature")
  .update({ status: input.status })
  .in("id", input.ids)
  .eq("organization_id", ctx.organization.id);
```

### Count

```typescript
const { data, error, count } = await ctx.supabase
  .from("feature")
  .select("*", { count: "exact" })
  .eq("organization_id", ctx.organization.id)
  .range(offset, offset + limit - 1);
```

### Search with OR

```typescript
query = query.or(
  `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
);
```

## Common Zod Patterns

```typescript
import { z } from "zod";
import { FeatureStatus } from "@/lib/enums";

// Create schema
export const createFeatureSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio").max(255),
  description: z.string().trim().max(1000).optional(),
  status: z.nativeEnum(FeatureStatus).default(FeatureStatus.draft),
  value: z.number().min(0).optional(),
});

// Update schema (all fields optional + id required)
export const updateFeatureSchema = createFeatureSchema.partial().extend({
  id: z.string().uuid(),
});

// List/filter input
export const listFeatureSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(FeatureStatus).optional(),
  sortBy: z.enum(["created_at", "name", "status"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
});

// Export types
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

## Logging

```typescript
import { logger } from "@/lib/logger";

// Object first, message second
logger.info({ featureId: data.id, userId: ctx.user.id }, "Feature created");
logger.error({ error, featureId: input.id }, "Failed to delete feature");

// NEVER use console.log
```

## Error Handling

```typescript
import { TRPCError } from "@trpc/server";

// Not found
throw new TRPCError({ code: "NOT_FOUND", message: "Feature non trovato" });

// Forbidden (role check)
throw new TRPCError({ code: "FORBIDDEN", message: "Operazione non autorizzata" });

// Internal error
throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

// Bad input
throw new TRPCError({ code: "BAD_REQUEST", message: "Dati non validi" });
```

## Admin Client (Bypass RLS)

Only for webhooks, admin operations, or SECURITY DEFINER replacements:

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

// ⚠️ Only use in webhooks/admin routes, NEVER for user-facing queries
const adminClient = createAdminClient();
```

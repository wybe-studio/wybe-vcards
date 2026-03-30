---
name: service-builder
description: Build reusable service modules for complex business logic that needs to be shared across tRPC procedures, webhooks, or admin operations. Use when logic is too complex for inline tRPC procedures or needs to be reused across multiple callers. Invoke with /service-builder.
---

# Service Builder

You are an expert at extracting and organizing reusable business logic into service modules.

## When to Use Services

In this project, **most business logic lives directly in tRPC procedures**. Extract a service when:

1. **Multiple callers need the same logic** — e.g., a tRPC procedure AND a webhook both create subscriptions
2. **Complex multi-step workflows** — e.g., onboarding that creates org + member + sets cookies
3. **Logic that needs unit testing in isolation** — pure business rules without DB access
4. **Admin operations** — logic shared between tRPC admin procedures and webhook handlers

**Don't extract a service** for simple CRUD that's only called from one tRPC procedure — keep it inline.

## Service Location

Services live in `lib/` organized by domain:

```
lib/
├── billing/              # Stripe integration services
│   ├── stripe.ts         # Stripe API helpers
│   └── webhooks.ts       # Webhook event handlers
├── auth/                 # Auth services
│   ├── server.ts         # getUser(), getSession()
│   └── client.ts         # Client-side auth
├── email/                # Email services
│   └── emails.ts         # Send functions
├── storage/              # Storage helpers
│   └── index.ts          # Upload/delete functions
└── [domain]/             # New domain services
    └── [domain].ts
```

## Service Patterns

### Pattern 1: Function-Based Service (Preferred)

For most cases, export plain functions that accept a Supabase client:

```typescript
// lib/feature/feature.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";

export async function createFeatureWithDefaults(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    name: string;
    userId: string;
  }
) {
  // Multi-step workflow
  const { data: feature, error } = await client
    .from("feature")
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;

  // Additional steps...
  logger.info({ featureId: feature.id }, "Feature created with defaults");

  return feature;
}
```

**Used from tRPC:**

```typescript
// trpc/routers/organization/feature-router.ts
create: protectedOrganizationProcedure
  .input(createFeatureSchema)
  .mutation(async ({ ctx, input }) => {
    return createFeatureWithDefaults(ctx.supabase, {
      organizationId: ctx.organization.id,
      name: input.name,
      userId: ctx.user.id,
    });
  }),
```

**Used from webhook:**

```typescript
// app/api/webhooks/stripe/route.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { createFeatureWithDefaults } from "@/lib/feature/feature";

const adminClient = createAdminClient();
await createFeatureWithDefaults(adminClient, { ... });
```

### Pattern 2: Pure Logic (No DB)

For business rules that don't need I/O:

```typescript
// lib/billing/pricing.ts

interface PricingInput {
  plan: "starter" | "pro" | "enterprise";
  seats: number;
  interval: "monthly" | "yearly";
}

export function calculatePricing(input: PricingInput) {
  const basePrices = { starter: 900, pro: 2900, enterprise: 9900 };
  const unitPrice = basePrices[input.plan];
  const discount = input.interval === "yearly" ? 0.2 : 0;
  const total = Math.round(unitPrice * input.seats * (1 - discount));

  return { unitPrice, total, discount, currency: "eur" };
}
```

### Pattern 3: Admin Client Service

For operations that bypass RLS (webhooks, admin tasks):

```typescript
// lib/billing/webhooks.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("subscription")
    .insert({
      id: subscription.id,
      organization_id: findOrgByStripeCustomer(subscription.customer),
      status: subscription.status,
      // ... other fields
    });

  if (error) {
    logger.error({ error, subscriptionId: subscription.id }, "Failed to create subscription");
    throw error;
  }

  logger.info({ subscriptionId: subscription.id }, "Subscription created");
}
```

## Rules

1. **Accept Supabase client as parameter** — never import `createClient` inside a service (except admin services that explicitly need to bypass RLS)
2. **Keep services focused** — one domain per file, small focused functions
3. **Use logger, not console.log** — object first, message second
4. **snake_case for DB columns** — always map camelCase inputs to snake_case
5. **Return data, don't format responses** — the caller (tRPC, webhook) handles response formatting
6. **Error handling** — throw errors, let the caller decide how to present them

## Anti-Patterns

```typescript
// ❌ BAD: Service creates its own Supabase client
export async function createFeature(data: CreateFeatureInput) {
  const client = createClient(); // coupling!
  // ...
}

// ❌ BAD: Service imports tRPC types
import { TRPCError } from "@trpc/server";
export async function createFeature(...) {
  throw new TRPCError({ code: "NOT_FOUND" }); // framework coupling!
}

// ❌ BAD: Extracting a service for simple single-use CRUD
// Just keep it in the tRPC procedure
```

## Testing

Services that accept a client parameter are easy to test:

```typescript
import { describe, it, expect, vi } from "vitest";
import { createFeatureWithDefaults } from "@/lib/feature/feature";

const mockClient = {
  from: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "feat-1", name: "Test", status: "draft" },
      error: null,
    }),
  })),
} as unknown as SupabaseClient;

it("creates feature with default status", async () => {
  const result = await createFeatureWithDefaults(mockClient, {
    organizationId: "org-1",
    name: "Test",
    userId: "user-1",
  });
  expect(result.status).toBe("draft");
});
```

## Examples

See `[Examples](examples.md)` for more patterns.

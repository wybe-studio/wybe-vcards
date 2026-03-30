# Service Examples

> **Nota**: Alcuni esempi usano il modulo **Lead** come riferimento. Lead è un'implementazione CRUD inclusa nel kit come esempio dei pattern — non sarà presente in tutti i progetti derivati.

## Existing Services in This Project

### Auth Service (`lib/auth/server.ts`)

```typescript
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Cached per-request user fetching
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
```

### Email Service (`lib/email/emails.ts`)

Fire-and-forget pattern:

```typescript
import { sendOrganizationInvitationEmail } from "@/lib/email/emails";

// In tRPC mutation — don't block the response
sendOrganizationInvitationEmail({ recipient, orgName, inviterName }).catch(
  (err) => {
    logger.error({ error: err }, "Failed to send invitation email");
  }
);
```

### Storage Service (`lib/storage/`)

```typescript
// Upload with path convention: {userId}/{uuid}.png
const path = `${user.id}/${crypto.randomUUID()}.png`;

// Delete old file before uploading new one
if (currentPath && !currentPath.startsWith("http")) {
  await supabase.storage.from("images").remove([currentPath]);
}

await supabase.storage
  .from("images")
  .upload(path, blob, { contentType: "image/png" });
```

## When to Extract: Before vs After

### Before (Logic Inline in tRPC) — Fine for simple CRUD

```typescript
// trpc/routers/organization/lead-router.ts
create: protectedOrganizationProcedure
  .input(createLeadSchema)
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from("lead")
      .insert({
        organization_id: ctx.organization.id,
        first_name: input.firstName,
        // ...
      })
      .select()
      .single();

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return data;
  }),
```

### After (Extracted Service) — When webhook also needs it

```typescript
// lib/lead/lead.ts
export async function createLeadFromWebhook(
  client: SupabaseClient<Database>,
  params: {
    organizationId: string;
    firstName: string;
    lastName: string;
    email: string;
    source: LeadSource;
  }
) {
  const { data, error } = await client
    .from("lead")
    .insert({
      organization_id: params.organizationId,
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      source: params.source,
      status: "new",
    })
    .select()
    .single();

  if (error) throw error;

  logger.info({ leadId: data.id }, "Lead created from webhook");
  return data;
}
```

```typescript
// Used from tRPC
create: protectedOrganizationProcedure
  .input(createLeadSchema)
  .mutation(async ({ ctx, input }) => {
    return createLeadFromWebhook(ctx.supabase, {
      organizationId: ctx.organization.id,
      ...input,
    });
  }),

// Used from webhook
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
await createLeadFromWebhook(adminClient, { ... });
```

## Multi-Step Workflow Service

```typescript
// lib/onboarding/onboarding.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export async function completeOnboarding(
  client: SupabaseClient,
  params: {
    userId: string;
    organizationName: string;
    organizationSlug: string;
  }
) {
  // Step 1: Create org with owner (uses SECURITY DEFINER function)
  const { data: orgId, error: orgError } = await client.rpc(
    "create_organization_with_owner",
    {
      org_name: params.organizationName,
      org_slug: params.organizationSlug,
      owner_user_id: params.userId,
    }
  );

  if (orgError) throw orgError;

  // Step 2: Mark onboarding complete
  const { error: profileError } = await client
    .from("user_profile")
    .update({ onboarding_complete: true })
    .eq("id", params.userId);

  if (profileError) throw profileError;

  // Step 3: Update user metadata
  await client.auth.updateUser({
    data: { onboardingComplete: true },
  });

  logger.info(
    { userId: params.userId, organizationId: orgId },
    "Onboarding completed"
  );

  return { organizationId: orgId };
}
```

## Pure Validation Service

```typescript
// lib/billing/credit-calculator.ts

export function calculateCreditCost(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const rates: Record<string, { input: number; output: number }> = {
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-3.5-turbo": { input: 0.001, output: 0.002 },
    "claude-3-sonnet": { input: 0.003, output: 0.015 },
  };

  const rate = rates[params.model];
  if (!rate) throw new Error(`Unknown model: ${params.model}`);

  const inputCost = (params.inputTokens / 1000) * rate.input;
  const outputCost = (params.outputTokens / 1000) * rate.output;

  return Math.ceil((inputCost + outputCost) * 100); // credits (cents)
}
```

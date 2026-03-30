---
description: End-to-end feature implementation following project patterns across database, API, and UI layers
---

# Feature Builder

You are an expert at implementing complete features following established patterns across all layers.

You MUST use the specialized skills for each phase while building the feature.

- Database Schema: `postgres-expert`
- Server Layer (tRPC): `server-action-builder`
- Forms: `react-form-builder`

## Implementation Phases

### Phase 1: Database Schema

Use `postgres-expert` skill.

1. Create migration file via `npm run db:migrate`
2. Define table with `organization_id` FK, RLS enabled
3. Create RLS policies using membership checks
4. Apply migration: `npm run db:reset`
5. Generate types: `npm run db:typegen`

```sql
-- Example migration
create type public.feature_status as enum ('draft', 'active', 'archived');

create table public.feature (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  status public.feature_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feature_organization_id_idx on public.feature(organization_id);
alter table public.feature enable row level security;

-- RLS: org members can read
create policy "feature_select" on public.feature for select to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- RLS: org members can insert
create policy "feature_insert" on public.feature for insert to authenticated with check (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- RLS: org members can update
create policy "feature_update" on public.feature for update to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- RLS: only owner/admin can delete
create policy "feature_delete" on public.feature for delete to authenticated using (
  exists (
    select 1 from public.member m
    where m.organization_id = feature.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
```

### Phase 2: Zod Schemas

Create in `schemas/`:

```typescript
// schemas/feature-schemas.ts
import { z } from "zod";
import { FeatureStatus } from "@/lib/enums";

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio").max(255),
  status: z.nativeEnum(FeatureStatus).default(FeatureStatus.draft),
});

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;

export const updateFeatureSchema = createFeatureSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

### Phase 3: tRPC Router

Use `server-action-builder` skill.

Create in `trpc/routers/organization/`:

1. **Router file** (`feature-router.ts`) with CRUD procedures
2. **Register** in `trpc/routers/organization/index.ts`
3. Use `protectedOrganizationProcedure` with `featureGuard` if behind a flag

### Phase 4: UI Components

Use `react-form-builder` skill.

Create in `components/` or page-level `_components/`:

1. **List component** — displays items with loading states, empty state
2. **Form component** — create/edit with `useZodForm` and tRPC mutation
3. **Detail component** — single item view (if needed)

### Phase 5: Page Integration

Create page in the appropriate route group:

```typescript
// app/(saas)/dashboard/organization/feature/page.tsx
import { FeatureList } from "@/components/feature/feature-list";

export default function FeaturePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feature</h1>
        {/* Add create button */}
      </div>
      <FeatureList />
    </div>
  );
}
```

### Phase 6: Navigation & Feature Flag (if applicable)

1. Add route to sidebar navigation config
2. Add feature flag in `config/features.config.ts` and `lib/env.ts` if needed
3. Wrap UI with `<FeatureGate feature="featureName">` if behind a flag
4. Add redirect in `proxy.ts` if the route should be blocked when flag is off

## File Structure

```
schemas/
└── feature-schemas.ts                    # Zod schemas + types
trpc/routers/
└── organization/
    ├── index.ts                          # Register feature router
    └── feature-router.ts                # CRUD procedures
components/
└── feature/
    ├── feature-list.tsx                  # List with data fetching
    ├── feature-form.tsx                  # Create/edit form
    └── feature-card.tsx                  # Card/row component
app/(saas)/dashboard/organization/
└── feature/
    └── page.tsx                          # Page
supabase/migrations/
└── YYYYMMDDHHMMSS_add_feature.sql       # Migration
```

## Verification Checklist

### Database Layer
- [ ] Migration created in `supabase/migrations/`
- [ ] Table has `organization_id` FK with `on delete cascade`
- [ ] RLS enabled on table
- [ ] RLS policies check membership via `member` table
- [ ] Index on `organization_id`
- [ ] Types regenerated with `npm run db:typegen`

### Server Layer (tRPC)
- [ ] Zod schema in `schemas/`
- [ ] Router in `trpc/routers/organization/`
- [ ] Uses `protectedOrganizationProcedure`
- [ ] Feature guard chained if behind a flag
- [ ] Always filters by `organization_id`
- [ ] camelCase input → snake_case DB mapping
- [ ] Logging with `logger` (object first, message second)
- [ ] `TRPCError` with proper codes
- [ ] Role check for destructive operations

### UI Layer
- [ ] Components in `components/` directory
- [ ] Forms use `useZodForm` with shared Zod schemas
- [ ] tRPC mutations with `onSuccess`/`onError` callbacks
- [ ] `isPending` for loading states
- [ ] Toast notifications (via `sonner`) for success/error
- [ ] `data-test` attributes for E2E testing
- [ ] All user-facing strings in Italian

### Integration
- [ ] Page in correct route group
- [ ] Navigation updated
- [ ] Feature flag configured (if applicable)
- [ ] `FeatureGate` wrapper in UI (if applicable)

### Final Verification

```bash
npm run lint && npm run typecheck
```

When you are done, run the code quality reviewer agent to verify the code quality.

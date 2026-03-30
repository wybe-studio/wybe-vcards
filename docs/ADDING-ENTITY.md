# Aggiungere una nuova entita CRUD

Guida completa per aggiungere un'entita gestita da un'organizzazione, dal database alla UI.
Usa il modulo **Lead** come reference.

## Prerequisiti

- L'entita appartiene a un'organizzazione (pattern multi-tenant)
- Scegli un pattern UI da [UI-PATTERNS.md](./UI-PATTERNS.md)

---

## Step 1: Migration database

Crea una nuova migration:

```bash
npm run db:migrate
```

### Template tabella

```sql
-- Tabella
create table public.entity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  -- Colonne specifiche dell'entita (snake_case)
  name text not null,
  description text,
  status text not null default 'active',
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indici (organization_id e sempre il primo)
create index entity_organization_id_idx on public.entity(organization_id);
create index entity_status_idx on public.entity(status);
create index entity_created_at_idx on public.entity(created_at);
create index entity_org_status_idx on public.entity(organization_id, status);

-- RLS
alter table public.entity enable row level security;
```

### Trigger updated_at

Il kit usa una funzione condivisa `trigger_set_updated_at()` gia definita nello schema iniziale. Basta aggiungere il trigger:

```sql
create trigger set_updated_at before update on public.entity
  for each row execute function trigger_set_updated_at();
```

### RLS policies

Il kit usa tre funzioni helper per le policy:

| Funzione | Scopo |
|----------|-------|
| `is_organization_member(org_id)` | `true` se l'utente e membro dell'org |
| `has_org_role(org_id, role)` | Verifica membership + ruolo con ereditarieta (`member` < `admin` < `owner`) |
| `is_platform_admin()` | `true` se `user_profile.role = 'admin'` |

Scegli una delle tre varianti:

#### Variante A: Tutti i membri hanno accesso completo (come Lead)

```sql
create policy "Org members have full access to entity"
  on public.entity for all to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin())
  with check (public.is_organization_member(organization_id) or public.is_platform_admin());
```

#### Variante B: Tutti leggono, solo admin scrivono/eliminano

```sql
-- SELECT: tutti i membri
create policy "Members can read entity"
  on public.entity for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

-- INSERT/UPDATE: solo admin+
create policy "Admins can insert entity"
  on public.entity for insert to authenticated
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

create policy "Admins can update entity"
  on public.entity for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- DELETE: solo admin+
create policy "Admins can delete entity"
  on public.entity for delete to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());
```

#### Variante C: Member vede solo i propri record, admin vede tutto

Richiede una colonna `user_id uuid references auth.users(id)` nella tabella.

```sql
-- SELECT: admin vede tutto, member solo i propri
create policy "Read entity"
  on public.entity for select to authenticated
  using (public.has_org_role(organization_id, 'admin') or user_id = auth.uid());

-- INSERT: tutti i membri, ma solo per se stessi
create policy "Insert entity"
  on public.entity for insert to authenticated
  with check (
    public.is_organization_member(organization_id)
    and user_id = auth.uid()
  );

-- UPDATE: admin tutto, member solo i propri
create policy "Update entity"
  on public.entity for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or user_id = auth.uid())
  with check (public.has_org_role(organization_id, 'admin') or user_id = auth.uid());

-- DELETE: admin tutto, member solo i propri
create policy "Delete entity"
  on public.entity for delete to authenticated
  using (public.has_org_role(organization_id, 'admin') or user_id = auth.uid());
```

### Applicare la migration

```bash
npm run db:reset      # Applica tutte le migration
npm run db:typegen    # Rigenera database.types.ts
```

> **Riferimento**: tabella `lead` in [`supabase/migrations/00000000000000_initial_schema.sql`](../supabase/migrations/00000000000000_initial_schema.sql) (riga 133)

---

## Step 2: Schema Zod

Crea `schemas/organization-entity-schemas.ts`.

Il pattern del kit usa `zod/v4`, campi camelCase (il mapping a snake_case avviene nel router), e quattro schema principali: list, create, update, delete/bulk.

```typescript
import { z } from "zod/v4";

// Campi ordinabili
export const EntitySortField = z.enum(["name", "status", "created_at"]);
export type EntitySortField = z.infer<typeof EntitySortField>;

// Lista con filtri, ricerca, ordinamento, paginazione
export const listEntitiesSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  query: z.string().optional(),
  sortBy: EntitySortField.default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  filters: z
    .object({
      status: z.array(z.string()).optional(),
    })
    .optional(),
});

// Creazione
export const createEntitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Il nome e obbligatorio")
    .max(200, "Il nome e troppo lungo"),
  description: z
    .string()
    .trim()
    .max(5000, "La descrizione e troppo lunga")
    .optional(),
  status: z.string().default("active"),
});

// Aggiornamento (partial + id)
export const updateEntitySchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Il nome e obbligatorio")
    .max(200, "Il nome e troppo lungo")
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "La descrizione e troppo lunga")
    .optional()
    .nullable(),
  status: z.string().optional(),
});

// Delete singolo
export const deleteEntitySchema = z.object({
  id: z.string().uuid(),
});

// Bulk delete
export const bulkDeleteEntitiesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

// Type exports
export type ListEntitiesInput = z.infer<typeof listEntitiesSchema>;
export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type DeleteEntityInput = z.infer<typeof deleteEntitySchema>;
export type BulkDeleteEntitiesInput = z.infer<typeof bulkDeleteEntitiesSchema>;
```

> **Riferimento**: [`schemas/organization-lead-schemas.ts`](../schemas/organization-lead-schemas.ts)

---

## Step 3: Router tRPC

Crea `trpc/routers/organization/organization-entity-router.ts`.

```typescript
import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  bulkDeleteEntitiesSchema,
  createEntitySchema,
  deleteEntitySchema,
  listEntitiesSchema,
  updateEntitySchema,
} from "@/schemas/organization-entity-schemas";
import {
  createTRPCRouter,
  featureGuard,
  protectedOrganizationProcedure,
} from "@/trpc/init";

/** Map sort field names to DB column names */
function mapSortColumn(sortBy: string | undefined): string {
  switch (sortBy) {
    case "name":
    case "status":
    case "created_at":
      return sortBy;
    default:
      return "created_at";
  }
}

export const organizationEntityRouter = createTRPCRouter({
  list: protectedOrganizationProcedure
    .use(featureGuard("entityFlag")) // <-- nome del tuo feature flag
    .input(listEntitiesSchema)
    .query(async ({ ctx, input }) => {
      const sortColumn = mapSortColumn(input.sortBy);
      const ascending = input.sortOrder !== "desc";

      let query = ctx.supabase
        .from("entity")
        .select("*", { count: "exact" })
        .eq("organization_id", ctx.organization.id)
        .order(sortColumn, { ascending })
        .range(input.offset, input.offset + input.limit - 1);

      // Ricerca testuale (ilike)
      if (input.query) {
        const q = input.query;
        query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      }

      // Filtri
      if (input.filters?.status && input.filters.status.length > 0) {
        query = query.in("status", input.filters.status);
      }

      const { data, count, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Impossibile elencare le entita: ${error.message}`,
        });
      }

      return { items: data ?? [], total: count ?? 0 };
    }),

  get: protectedOrganizationProcedure
    .use(featureGuard("entityFlag"))
    .input(deleteEntitySchema) // riusa lo schema con solo `id`
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("entity")
        .select("*")
        .eq("id", input.id)
        .eq("organization_id", ctx.organization.id)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Non trovato" });
      }

      return data;
    }),

  create: protectedOrganizationProcedure
    .use(featureGuard("entityFlag"))
    .input(createEntitySchema)
    .mutation(async ({ ctx, input }) => {
      // Map camelCase input -> snake_case DB columns
      const insertData: Record<string, unknown> = {
        organization_id: ctx.organization.id,
        name: input.name,
        description: input.description,
        status: input.status,
      };

      const { data, error } = await ctx.supabase
        .from("entity")
        .insert(
          Object.fromEntries(
            Object.entries(insertData).filter(([, v]) => v !== undefined),
          ) as Database["public"]["Tables"]["entity"]["Insert"],
        )
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Impossibile creare: ${error.message}`,
        });
      }

      return data;
    }),

  update: protectedOrganizationProcedure
    .use(featureGuard("entityFlag"))
    .input(updateEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...inputData } = input;

      // Map camelCase input -> snake_case DB columns
      const updateData: Record<string, unknown> = {};
      if (inputData.name !== undefined) updateData.name = inputData.name;
      if (inputData.description !== undefined)
        updateData.description = inputData.description;
      if (inputData.status !== undefined) updateData.status = inputData.status;

      const { data, error } = await ctx.supabase
        .from("entity")
        .update(updateData)
        .eq("id", id)
        .eq("organization_id", ctx.organization.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Non trovato" });
      }

      return data;
    }),

  delete: protectedOrganizationProcedure
    .use(featureGuard("entityFlag"))
    .input(deleteEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("entity")
        .delete()
        .eq("id", input.id)
        .eq("organization_id", ctx.organization.id)
        .select("id");

      if (error || !data || data.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Non trovato" });
      }

      return { success: true };
    }),

  bulkDelete: protectedOrganizationProcedure
    .use(featureGuard("entityFlag"))
    .input(bulkDeleteEntitiesSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("entity")
        .delete()
        .in("id", input.ids)
        .eq("organization_id", ctx.organization.id)
        .select("id");

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Impossibile eliminare: ${error.message}`,
        });
      }

      return { success: true, count: data?.length ?? 0 };
    }),
});
```

### Registrare il router

In `trpc/routers/organization/index.ts`, aggiungi l'import e il sub-router:

```typescript
import { organizationEntityRouter } from "@/trpc/routers/organization/organization-entity-router";

export const organizationRouter = createTRPCRouter({
  // ... router esistenti
  lead: organizationLeadRouter,
  entity: organizationEntityRouter,  // <-- aggiungi qui
  management: organizationManagementRouter,
  // ...
});
```

> **Riferimento**: [`trpc/routers/organization/organization-lead-router.ts`](../trpc/routers/organization/organization-lead-router.ts), [`trpc/routers/organization/index.ts`](../trpc/routers/organization/index.ts)

---

## Step 4: Pagina UI

Consulta [UI-PATTERNS.md](./UI-PATTERNS.md) per scegliere il pattern. Il piu comune e il **Pattern A** (tabella con filtri, sort, modal).

### File da creare

| File | Scopo |
|------|-------|
| `app/(saas)/dashboard/(sidebar)/organization/entities/page.tsx` | Pagina server |
| `components/organization/entities-table.tsx` | Tabella con filtri e sort |
| `components/organization/entities-modal.tsx` | Sheet/modal per create/edit |
| `components/organization/entities-bulk-actions.tsx` | Azioni bulk (opzionale) |

### Template pagina server

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
import { EntitiesTable } from "@/components/organization/entities-table";
import {
  Page,
  PageBody,
  PageBreadcrumb,
  PageContent,
  PageHeader,
  PagePrimaryBar,
} from "@/components/ui/custom/page";
import { getOrganizationById, getSession } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Entita",
};

export default async function EntitiesPage(): Promise<React.JSX.Element> {
  const session = await getSession();
  if (!session?.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  const organization = await getOrganizationById(
    session.session.activeOrganizationId,
  );
  if (!organization) {
    redirect("/dashboard");
  }

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageBreadcrumb
            segments={[
              { label: "Home", href: "/dashboard" },
              { label: organization.name, href: "/dashboard/organization" },
              { label: "Entita" },
            ]}
          />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody>
        <PageContent title="Entita">
          <EntitiesTable />
        </PageContent>
      </PageBody>
    </Page>
  );
}
```

> **Riferimento**: [`app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx`](../app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx), [`components/organization/leads-table.tsx`](../components/organization/leads-table.tsx), [`components/organization/leads-modal.tsx`](../components/organization/leads-modal.tsx)

---

## Step 5: Navigazione

### Voce sidebar

In `components/organization/organization-menu-items.tsx`, aggiungi l'item nel gruppo "Applicazione", condizionato dal feature flag:

```typescript
import { BoxIcon } from "lucide-react"; // scegli un'icona appropriata

// Nel menuGroups, dentro items del gruppo "Applicazione":
...(featuresConfig.entities
  ? [{ label: "Entita", href: `${basePath}/entities`, icon: BoxIcon }]
  : []),
```

Il pattern usato dal kit: spread condizionale con `featuresConfig.nomeFlag`.

### Redirect middleware

In `proxy.ts`, aggiungi un blocco per redirigere le rotte dell'entita quando il flag e disabilitato:

```typescript
// Feature flag: redirect entity routes when feature is disabled
if (!featuresConfig.entities) {
  if (pathname.startsWith("/dashboard/organization/entities")) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }
}
```

> **Riferimento**: [`components/organization/organization-menu-items.tsx`](../components/organization/organization-menu-items.tsx) (riga 79), [`proxy.ts`](../proxy.ts)

---

## Step 6: Feature flag (opzionale)

Se l'entita deve essere attivabile/disattivabile, segui questi 5 passaggi:

1. **`lib/env.ts`** -- aggiungi la variabile d'ambiente:
   ```typescript
   NEXT_PUBLIC_FEATURE_ENTITIES: z.coerce.boolean().default(true),
   ```

2. **`config/features.config.ts`** -- aggiungi al config e al tipo `FeaturesConfig`:
   ```typescript
   entities: env.NEXT_PUBLIC_FEATURE_ENTITIES,
   ```

3. **Router tRPC** -- proteggi le procedure:
   ```typescript
   .use(featureGuard("entities"))
   ```

4. **UI** -- wrappa i componenti:
   ```typescript
   import { FeatureGate } from "@/components/feature-gate";
   <FeatureGate feature="entities"><EntitiesSection /></FeatureGate>
   ```

5. **Middleware** -- redirect in `proxy.ts` (vedi Step 5)

> **Riferimento**: [docs/FEATURE-FLAGS.md](./FEATURE-FLAGS.md)

---

## Checklist

- [ ] Migration: tabella + indici + RLS + trigger `set_updated_at`
- [ ] `npm run db:reset && npm run db:typegen`
- [ ] Schema Zod (create, update, list, delete, bulk)
- [ ] Router tRPC (list, get, create, update, delete, bulkDelete)
- [ ] Registrare router in `trpc/routers/organization/index.ts`
- [ ] Pagina UI con pattern scelto (vedi [UI-PATTERNS.md](./UI-PATTERNS.md))
- [ ] Voce sidebar in `organization-menu-items.tsx` + `featuresConfig`
- [ ] Feature flag (se necessario): env, config, guard, gate, proxy
- [ ] `npm run lint && npm run typecheck`

---

## Documenti correlati

- [UI-PATTERNS.md](./UI-PATTERNS.md) -- Pattern UI disponibili
- [MODULES.md](./MODULES.md) -- Panoramica moduli del kit
- [EXTENDING-ORGANIZATION.md](./EXTENDING-ORGANIZATION.md) -- Dati aggiuntivi organizzazione (1:1)
- [FEATURE-FLAGS.md](./FEATURE-FLAGS.md) -- Sistema feature flag completo

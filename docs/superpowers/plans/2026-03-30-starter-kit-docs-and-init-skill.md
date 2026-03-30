# Starter Kit Documentation & Init Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create comprehensive starter kit documentation (MODULES.md, UI-PATTERNS.md, ADDING-ENTITY.md) and a `/init-project` skill that orchestrates new project initialization.

**Architecture:** Three documentation files serve as the single source of truth for the kit's modules, UI patterns, and entity creation process. A skill in `.claude/skills/init-project/` reads these docs and guides users through a structured init flow (discovery -> structuring -> spec generation). The skill produces a spec that feeds into `writing-plans` -> `executing-plans`.

**Tech Stack:** Markdown documentation, Claude Code skill system (.claude/skills/), existing project patterns as reference.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `docs/MODULES.md` | Complete module inventory with tables, routers, pages, dependencies, feature flags |
| Create | `docs/UI-PATTERNS.md` | 4 core UI patterns (CRUD table, settings tabs, card grid, wizard) with code + reference links |
| Create | `docs/ADDING-ENTITY.md` | Step-by-step guide for adding a CRUD entity (DB -> Zod -> tRPC -> UI -> nav -> feature flag) |
| Create | `.claude/skills/init-project/SKILL.md` | Main skill: 3-phase flow (discovery, structuring, spec generation) |
| Create | `.claude/skills/init-project/questions.md` | Reference questions organized by phase with response-to-decision mappings |
| Create | `.claude/skills/init-project/spec-template.md` | Template for the generated project spec |

---

### Task 1: Create `docs/MODULES.md`

**Files:**
- Create: `docs/MODULES.md`

**Reference files to consult while writing:**
- `config/features.config.ts` (feature flags and constraints)
- `trpc/routers/organization/index.ts` (sub-router registration)
- `trpc/routers/app.ts` (root router)
- `components/organization/organization-menu-items.tsx` (sidebar menu structure)
- `proxy.ts` (feature flag redirects)
- `supabase/migrations/00000000000000_initial_schema.sql` (all tables)

- [ ] **Step 1: Write the module index table**

Start the file with a summary table of all modules:

```markdown
# Moduli del Kit

Mappa completa dei moduli dello starter kit. Ogni modulo e documentato con tabelle DB, router tRPC, pagine, componenti, e dipendenze.

## Indice moduli

| Modulo | Feature Flag | Default | Dipendenze | Note |
|--------|-------------|---------|------------|------|
| Auth | sempre attivo | — | Nessuna (base) | Email/password, OAuth, 2FA |
| Organizations | `multiOrg` | true | Auth | Multi-tenant, ruoli, inviti |
| Billing | `billing` | true | Organizations | Stripe, abbonamenti, crediti |
| Leads | `leads` | true | Organizations | **Modulo reference per pattern CRUD** |
| AI Chatbot | `aiChatbot` | true | Organizations, Billing | Chat AI con sistema crediti |
| Onboarding | `onboarding` | true | Auth, Organizations | Wizard setup iniziale |
| Admin Panel | sempre attivo | — | Auth | Gestione utenti e org |
| Contact Form | sempre attivo | — | Nessuna | Form pubblico con CAPTCHA |

### Feature flag aggiuntivi

| Flag | Default | Effetto |
|------|---------|---------|
| `publicRegistration` | true | Abilita `/auth/sign-up`. Se false, solo admin crea utenti |
| `googleAuth` | false | Abilita login/registrazione con Google OAuth |
| `personalAccountOnly` | false | Disabilita multi-org, ogni utente ha una sola org personale |

### Vincoli tra flag
- `personalAccountOnly=true` forza `multiOrg=false`
- `billing=false` disabilita procedure crediti (AI chatbot funziona ma senza billing crediti)
```

- [ ] **Step 2: Write the Auth module section**

```markdown
---

## Auth (sempre attivo)

Autenticazione email/password con verifica email, reset password, OAuth Google opzionale, e supporto 2FA/TOTP.

### Tabelle DB
- `user_profile` — Estende `auth.users` con: `role` (user/admin), `onboarding_complete`, `banned`, `ban_reason`, `ban_expires`

### Router tRPC
- `user.getSession` — Sessione corrente e profilo
- `user.getActiveSessions` — Lista sessioni attive
- `user.getAccounts` — Account collegati (OAuth)
- `user.deleteAccount` — Eliminazione account con cascade

### Pagine
| Percorso | Scopo |
|----------|-------|
| `/auth/sign-in` | Login email + Google OAuth |
| `/auth/sign-up` | Registrazione (gated da `publicRegistration`) |
| `/auth/verify` | Verifica email |
| `/auth/forgot-password` | Richiesta reset password |
| `/auth/reset-password` | Form reset password |
| `/auth/banned` | Pagina utente bannato |
| `/auth/callback` | Callback OAuth |
| `/auth/confirm` | Conferma email (interno) |

### Componenti chiave
- `components/auth/` — Form login, signup, reset password
- `components/session-provider.tsx` — Provider contesto sessione
- `lib/auth/server.ts` — `getSession()`, `getUser()`, `assertUserIsOrgMember()`
- `lib/auth/client.ts` — Utilities client-side
- `lib/auth/constants.ts` — Costanti + `translateSupabaseError()`
- `lib/auth/utils.ts` — `isOrganizationAdmin()`

### Personalizzazione
- `googleAuth` flag per OAuth Google (richiede `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`)
- `publicRegistration` flag per signup aperto
- `config/auth.config.ts` per configurazione provider
```

- [ ] **Step 3: Write the Organizations module section**

Document the Organizations module following the same structure: description, tables (organization, member, invitation), tRPC routers (organization.list/get/create, organization.management.* with all sub-procedures), pages (/dashboard/organization, /dashboard/organization/settings, /dashboard/organization-invitation/[id]), key components (organization-switcher, members-table, invitations-table, create-org-modal, org-grid, settings-tabs, menu-items), DB functions (create_organization_with_owner, get_organization_members, accept_invitation, reject_invitation), email templates (organization-invitation, revoked-invitation), and dependencies (requires Auth, required by Billing/Leads/AI/Onboarding).

Reference files:
- `trpc/routers/organization/index.ts`
- `trpc/routers/organization/organization-management-router.ts`
- `components/organization/organization-menu-items.tsx`
- `schemas/organization-schemas.ts`

- [ ] **Step 4: Write the Billing module section**

Document the Billing module: description, tables (subscription, subscription_item, order, order_item, credit_balance, credit_transaction, credit_deduction_failure, billing_event), tRPC routers (organization.subscription.* and organization.credit.* with all procedures, admin.organization.adjustCredits/syncFromStripe/cancelSubscription), pages (/dashboard/choose-plan, /pricing, billing tab in org settings), key components (components/billing/), lib infrastructure (lib/billing/ with 19 modules listed), config (config/billing.config.ts with plans/packages/credit costs), API routes (/api/webhooks/stripe), email templates (payment-failed, subscription-canceled, trial-ending-soon, dispute-received), and dependencies (requires Organizations, required by AI Chatbot for credits).

Reference files:
- `config/billing.config.ts`
- `trpc/routers/organization/organization-subscription-router.ts`
- `trpc/routers/organization/organization-credit-router.ts`
- `lib/billing/index.ts`

- [ ] **Step 5: Write the Leads module section**

```markdown
---

## Leads (feature flag: `leads`)

Gestione lead con tabella filtrata, ordinamento, paginazione, azioni bulk, ed export CSV/Excel. **Questo e il modulo reference per il pattern CRUD completo** — usarlo come template per nuove entita.

### Tabelle DB
- `lead` — `id`, `organization_id` (FK), `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `status` (enum: new/contacted/qualified/proposal/negotiation/won/lost), `source` (enum: website/referral/social_media/advertising/cold_call/email/event/other), `estimated_value`, `notes`, `assigned_to_id` (FK auth.users), `created_at`, `updated_at`

### Router tRPC
- `organization.lead.list` — Lista con paginazione, ricerca, filtri (status, source, createdAt), ordinamento
- `organization.lead.get` — Singolo lead
- `organization.lead.create` — Creazione
- `organization.lead.update` — Modifica
- `organization.lead.delete` — Eliminazione
- `organization.lead.bulkDelete` — Eliminazione multipla
- `organization.lead.bulkUpdateStatus` — Cambio stato multiplo
- `organization.lead.export` — Export CSV/Excel

### Pagine
| Percorso | Scopo |
|----------|-------|
| `/dashboard/organization/leads` | Gestione lead (tabella + sheet) |

### Componenti chiave
- `components/organization/leads-table.tsx` — Tabella con filtri, sort, paginazione
- `components/organization/leads-modal.tsx` — Sheet form create/edit
- `components/organization/leads-bulk-actions.tsx` — Azioni bulk (delete, status change, export)

### Schema Zod
- `schemas/organization-lead-schemas.ts` — `createLeadSchema`, `updateLeadSchema`, `listLeadsSchema`, `bulkDeleteLeadsSchema`, `bulkUpdateLeadsStatusSchema`, `exportLeadsSchema`

### Dipendenze
- Richiede: Organizations
- Richiesto da: nessuno

### Guard a 3 livelli
1. **UI**: `featuresConfig.leads` in `organization-menu-items.tsx` (riga 79-81)
2. **API**: `featureGuard("leads")` in `organization-lead-router.ts`
3. **Middleware**: redirect in `proxy.ts` per `/dashboard/organization/leads`
```

- [ ] **Step 6: Write remaining module sections**

Write sections for:

**AI Chatbot** (`aiChatbot` flag): table `ai_chat`, router `organization.ai.*` (listChats, getChat, createChat, updateChat, deleteChat, togglePinned, sendMessage), pages (/dashboard/organization/chatbot), components (components/ai/), API route (/api/ai/chat), dependencies (Organizations, Billing for credits).

**Onboarding** (`onboarding` flag): field `user_profile.onboarding_complete`, pages (/dashboard/onboarding), components (components/onboarding/), middleware redirect in proxy.ts, auto-creation of personal org.

**Admin Panel** (always active): access to all tables via admin procedures, routers admin.user.* and admin.organization.*, pages (/dashboard/admin/users, /dashboard/admin/organizations, /dashboard/admin/app-config), components (components/admin/), requires user_profile.role='admin'.

**Contact Form** (always active): router contact.send, page /contact, email template contact-form-email.tsx, Turnstile CAPTCHA.

Each section follows the same structure established in steps 2-5.

- [ ] **Step 7: Add configuration reference section**

Add a final section listing key config files:

```markdown
---

## File di configurazione

| File | Scopo |
|------|-------|
| `config/app.config.ts` | Nome app, URL, contatti, paginazione, tema |
| `config/features.config.ts` | Feature flag (legge da env) |
| `config/billing.config.ts` | Piani, prezzi, pacchetti crediti, modelli AI |
| `config/auth.config.ts` | Provider OAuth, CORS |
| `lib/env.ts` | Variabili d'ambiente (validazione Zod) |
| `supabase/config.toml` | Configurazione Supabase locale |

## Documenti correlati
- [ADDING-ENTITY.md](./ADDING-ENTITY.md) — Come aggiungere una nuova entita CRUD
- [UI-PATTERNS.md](./UI-PATTERNS.md) — Pattern UI riutilizzabili
- [EXTENDING-ORGANIZATION.md](./EXTENDING-ORGANIZATION.md) — Estendere i dati dell'organizzazione
- [FEATURE-FLAGS.md](./FEATURE-FLAGS.md) — Gestione feature flag
- [ROLES.md](../ROLES.md) — Sistema ruoli
```

- [ ] **Step 8: Commit**

```bash
git add docs/MODULES.md
git commit -m "docs: add MODULES.md — complete module inventory for starter kit"
```

---

### Task 2: Create `docs/UI-PATTERNS.md`

**Files:**
- Create: `docs/UI-PATTERNS.md`

**Reference files to consult while writing:**
- `app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx` (pattern A page)
- `components/organization/leads-table.tsx` (pattern A table)
- `components/organization/leads-modal.tsx` (pattern A sheet form)
- `components/organization/leads-bulk-actions.tsx` (pattern A bulk actions)
- `components/organization/organization-settings-tabs.tsx` (pattern B tabs)
- `components/organization/organization-change-name-card.tsx` (pattern B card)
- `components/organization/organization-logo-card.tsx` (pattern B card)
- `components/organization/delete-organization-card.tsx` (pattern B danger card)
- `components/organization/organizations-grid.tsx` (pattern C grid)
- `app/(saas)/dashboard/onboarding/page.tsx` (pattern E wizard)
- `components/onboarding/` (pattern E step components)

- [ ] **Step 1: Write header and pattern A (CRUD Table + Sheet)**

Write the file header explaining the purpose, then Pattern A in full. Pattern A is the most detailed because it's the primary CRUD pattern and Lead is the reference module.

Structure for Pattern A:
- **Quando usarlo**: Gestione entita con lista, filtri, ordinamento, azioni bulk, form in sheet laterale
- **Struttura visuale**: Description of header + filters bar + sortable/paginated table + bulk actions + sheet with form
- **Componenti utilizzati**: DataTable (from `@/components/ui/custom/data-table`), Sheet/SheetContent, Input, Select, useZodForm, nuqs for query state, NiceModal
- **Snippet struttura pagina**: Based on actual `leads/page.tsx`:

```tsx
// Server component — page.tsx
import { getOrganizationById, getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "EntityName" };

export default async function EntityPage() {
  const session = await getSession();
  if (!session?.session.activeOrganizationId) redirect("/dashboard");

  const organization = await getOrganizationById(session.session.activeOrganizationId);
  if (!organization) redirect("/dashboard");

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageBreadcrumb segments={[
            { label: "Home", href: "/dashboard" },
            { label: organization.name, href: "/dashboard/organization" },
            { label: "Entity" },
          ]} />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody>
        <PageContent title="Entity">
          <EntityTable />
        </PageContent>
      </PageBody>
    </Page>
  );
}
```

- **Snippet struttura tabella**: Key pattern from leads-table.tsx (client component with "use client", NiceModal, tanstack/react-table, nuqs query state, filters, pagination, column definitions)
- **Snippet struttura sheet form**: Key pattern from leads-modal.tsx (Sheet with useZodForm, tRPC mutation, create/edit mode)
- **File di reference** with full paths to all Lead module files

- [ ] **Step 2: Write pattern B (Settings Tabs)**

Based on actual `organization-settings-tabs.tsx`:

- **Quando usarlo**: Pagine impostazioni con sezioni raggruppate per argomento
- **Struttura**: Tab navigation orizzontale con card per sezione
- **Componenti**: UnderlinedTabs/UnderlinedTabsList/UnderlinedTabsTrigger/UnderlinedTabsContent (from `@/components/ui/custom/underlined-tabs`), Card, useZodForm, nuqs for tab state
- **Snippet struttura**: Based on actual settings-tabs code:

```tsx
"use client";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { UnderlinedTabs, UnderlinedTabsContent, UnderlinedTabsList, UnderlinedTabsTrigger } from "@/components/ui/custom/underlined-tabs";

const tabValues = ["general", "members", "custom-tab"] as const;
type TabValue = (typeof tabValues)[number];

export function EntitySettingsTabs({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(tabValues).withDefault("general"),
  );

  return (
    <UnderlinedTabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
      <UnderlinedTabsList>
        <UnderlinedTabsTrigger value="general">Generale</UnderlinedTabsTrigger>
        <UnderlinedTabsTrigger value="members">Membri</UnderlinedTabsTrigger>
      </UnderlinedTabsList>
      <UnderlinedTabsContent value="general">
        <div className="space-y-4">
          <SettingCard />
          <DangerCard />
        </div>
      </UnderlinedTabsContent>
    </UnderlinedTabs>
  );
}
```

- **Pattern card impostazioni**: Each card has title, description, form/action. Danger cards (delete) at the bottom.
- **File di reference** with paths to settings-tabs, change-name-card, logo-card, delete-card, members-card

- [ ] **Step 3: Write pattern C (Card Grid)**

Based on actual `organizations-grid.tsx`:

- **Quando usarlo**: Lista entita come card in griglia responsive, selezione, overview
- **Struttura**: Header + griglia responsive + empty state con CTA
- **Componenti**: Card/CardContent/CardFooter, Empty/EmptyHeader/EmptyTitle/EmptyDescription, Skeleton, NiceModal, useProgressRouter
- **Snippet struttura**: Based on actual grid code:

```tsx
"use client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function EntityGrid() {
  const { data, isPending } = trpc.namespace.list.useQuery();

  if (isPending) {
    return (
      <div className="@container">
        <div className="grid @3xl:grid-cols-3 @xl:grid-cols-2 grid-cols-1 gap-4">
          {[...new Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nessun elemento</EmptyTitle>
          <EmptyDescription>Crea il primo elemento per iniziare.</EmptyDescription>
        </EmptyHeader>
        <Button onClick={() => NiceModal.show(CreateEntityModal)}>Crea</Button>
      </Empty>
    );
  }

  return (
    <div className="@container">
      <div className="grid @3xl:grid-cols-3 @xl:grid-cols-2 grid-cols-1 gap-4">
        {data.map(item => <EntityCard key={item.id} {...item} />)}
      </div>
    </div>
  );
}
```

- **Note**: Uses `@container` queries (not media queries) for responsive grid. Skeleton loading state. Empty state with CTA.
- **File di reference**: `components/organization/organizations-grid.tsx`

- [ ] **Step 4: Write pattern E (Wizard Multi-step)**

Based on actual onboarding implementation:

- **Quando usarlo**: Flussi guidati con step sequenziali, validazione per step, e progressione visuale
- **Struttura**: Server page validates session + redirects if already complete. Client component manages step state.
- **Componenti**: useState for step, Card, Button, useZodForm with per-step schema, progress indicator
- **Snippet struttura page** (server):

```tsx
// Server component — validates and redirects
import { getSession } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Setup wizard" };

export default async function WizardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");
  // Redirect if already completed
  if (session.user.user_metadata.wizardComplete) redirect("/dashboard");

  return <WizardCard />;
}
```

- **Snippet struttura wizard** (client):

```tsx
"use client";
import { useState } from "react";

const STEPS = ["profile", "settings", "complete"] as const;

export function WizardCard() {
  const [step, setStep] = useState(0);

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-6 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={cn(
            "h-1 flex-1 rounded-full",
            i <= step ? "bg-primary" : "bg-muted"
          )} />
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <ProfileStep onNext={() => setStep(1)} />}
      {step === 1 && <SettingsStep onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && <CompleteStep />}
    </div>
  );
}
```

- **File di reference**: `app/(saas)/dashboard/onboarding/page.tsx`, `components/onboarding/`

- [ ] **Step 5: Add closing section with pattern selection guide**

```markdown
---

## Come scegliere il pattern

| Scenario | Pattern consigliato |
|----------|-------------------|
| Gestione lista entita con CRUD completo | A — Tabella CRUD con Sheet |
| Pagina impostazioni con sezioni | B — Settings a Tab |
| Selezione/overview di entita | C — Griglia Card |
| Flusso guidato multi-step | E — Wizard Multi-step |
| Dashboard con metriche | Combinazione di Card + pattern custom |

## Documenti correlati
- [MODULES.md](./MODULES.md) — Moduli del kit
- [ADDING-ENTITY.md](./ADDING-ENTITY.md) — Aggiungere una nuova entita
```

- [ ] **Step 6: Commit**

```bash
git add docs/UI-PATTERNS.md
git commit -m "docs: add UI-PATTERNS.md — 4 core UI patterns with code and reference links"
```

---

### Task 3: Create `docs/ADDING-ENTITY.md`

**Files:**
- Create: `docs/ADDING-ENTITY.md`

**Reference files to consult while writing:**
- `supabase/migrations/00000000000000_initial_schema.sql` (lead table, RLS, triggers)
- `schemas/organization-lead-schemas.ts` (full Zod schemas)
- `trpc/routers/organization/organization-lead-router.ts` (full router)
- `trpc/routers/organization/index.ts` (router registration)
- `app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx` (page structure)
- `components/organization/organization-menu-items.tsx` (sidebar integration)
- `proxy.ts` (feature flag redirects)
- `docs/EXTENDING-ORGANIZATION.md` (style reference)
- `docs/FEATURE-FLAGS.md` (feature flag guide)

- [ ] **Step 1: Write header and Step 1 (Database migration)**

Write the intro explaining this is a step-by-step guide following `EXTENDING-ORGANIZATION.md` style, then the database step with:
- SQL template for table creation (uuid PK, organization_id FK, timestamps, indexes, updated_at trigger)
- SQL template for RLS policies using kit helper functions (`is_organization_member`, `has_org_role`, `is_platform_admin`)
- Variants for different permission models (all members CRUD, admin-only write, user sees only own)
- Commands: `npm run db:migrate`, `npm run db:reset`, `npm run db:typegen`
- Reference: link to lead table in initial_schema migration

Use the actual lead table from the migration as the concrete example, with comments showing what to customize.

- [ ] **Step 2: Write Step 2 (Zod schema)**

Based on actual `schemas/organization-lead-schemas.ts` structure:
- Create schema (required fields with validation messages in Italian)
- Update schema (partial + id)
- List schema (search, filters, sortBy enum, sortOrder, limit/offset with defaults)
- Bulk action schemas (ids array)
- Type exports
- Reference: link to `schemas/organization-lead-schemas.ts`

- [ ] **Step 3: Write Step 3 (tRPC router)**

Based on actual `organization-lead-router.ts`:
- Router creation with `createTRPCRouter`
- Procedure with `protectedOrganizationProcedure.use(featureGuard("flag")).input(schema)`
- List procedure: query building with filters, search (ilike), sort, pagination (range)
- Create/update/delete procedures: `ctx.supabase.from("table")` with `organization_id` from `ctx.organization.id`
- Router registration in `trpc/routers/organization/index.ts`
- Reference: link to `organization-lead-router.ts`

- [ ] **Step 4: Write Step 4 (UI page) and Step 5 (Navigation)**

Step 4: UI page creation
- Rimando a `docs/UI-PATTERNS.md` for pattern choice
- File table for pattern A (page, table, modal, bulk-actions)
- Reference: lead module files

Step 5: Navigation integration
- Sidebar: add item to `components/organization/organization-menu-items.tsx` with feature gate
- FeatureGate wrapper for conditional rendering
- Middleware redirect in `proxy.ts` when flag is disabled
- Reference: actual code from organization-menu-items.tsx showing featuresConfig.leads pattern

- [ ] **Step 5: Write Step 6 (Feature flag) and Checklist**

Feature flag creation (optional, for modular features):
1. `lib/env.ts` — add NEXT_PUBLIC_FEATURE_X variable
2. `config/features.config.ts` — add to raw object and FeaturesConfig type
3. `featureGuard("x")` in tRPC router
4. `<FeatureGate feature="x">` in UI
5. Redirect in `proxy.ts`
Reference: `docs/FEATURE-FLAGS.md`

Final checklist:
```markdown
## Checklist

- [ ] Migration: tabella + indici + RLS + trigger updated_at
- [ ] `npm run db:reset && npm run db:typegen`
- [ ] Schema Zod (create, update, list, bulk)
- [ ] Router tRPC (list, get, create, update, delete)
- [ ] Registrare router in `trpc/routers/organization/index.ts`
- [ ] Pagina UI con pattern scelto (vedi [UI-PATTERNS.md](./UI-PATTERNS.md))
- [ ] Voce sidebar in `organization-menu-items.tsx` + FeatureGate
- [ ] Feature flag (se necessario): env, config, guard, gate, proxy
- [ ] `npm run lint && npm run typecheck`
```

Related docs links at bottom.

- [ ] **Step 6: Commit**

```bash
git add docs/ADDING-ENTITY.md
git commit -m "docs: add ADDING-ENTITY.md — step-by-step guide for new CRUD entities"
```

---

### Task 4: Create `.claude/skills/init-project/SKILL.md`

**Files:**
- Create: `.claude/skills/init-project/SKILL.md`

**Reference files to consult while writing:**
- `docs/MODULES.md` (created in Task 1)
- `docs/UI-PATTERNS.md` (created in Task 2)
- `docs/ADDING-ENTITY.md` (created in Task 3)
- `.claude/skills/postgres-expert/SKILL.md` (style reference for skill format)
- `.claude/skills/react-form-builder/SKILL.md` (style reference)
- `CLAUDE.md` (project conventions)

- [ ] **Step 1: Write the skill frontmatter and prerequisites**

```markdown
---
name: init-project
description: Inizializza un nuovo progetto partendo dallo starter kit. Raccoglie requisiti tramite domande guidate (discovery, strutturazione, validazione) e genera uno spec completo per l'implementazione.
---

# Init Project

Skill per inizializzare un nuovo progetto derivato dallo starter kit.

## Prerequisiti

Prima di iniziare, LEGGERE questi documenti per comprendere il kit:
- `docs/MODULES.md` — moduli disponibili, feature flag, dipendenze
- `docs/UI-PATTERNS.md` — pattern UI riutilizzabili con code reference
- `docs/ADDING-ENTITY.md` — come si aggiunge una nuova entita CRUD
- `CLAUDE.md` — convenzioni del progetto (naming, stile, lingua italiana)

## Principi

- **Una domanda alla volta** — Non sovraccaricare l'utente
- **Ascolta prima, struttura dopo** — Le domande aperte vengono prima di quelle tecniche
- **Consiglia attivamente** — Non chiedere solo "vuoi X?", di' "consiglio X perche Y"
- **Riformula per conferma** — Dopo ogni risposta, riformula brevemente e chiedi conferma
- **Se l'utente non sa, proponi un default** — "Se non sei sicuro, possiamo partire con X e cambiare dopo"
```

- [ ] **Step 2: Write Phase 1 — Discovery**

```markdown
## Fase 1 — Discovery (domande aperte)

Obiettivo: capire il progetto, lo scope, il contesto. Identificare entita e flussi.

### Domande (una alla volta)

1. **Progetto**: "Descrivi il progetto in poche frasi — cosa fa e per chi e pensato?"

2. **Funzionalita**: "Quali sono le funzionalita principali che vuoi implementare?"
   - Se la risposta e vaga, approfondire: "Puoi farmi un esempio concreto di cosa farebbe un utente?"

3. **Flusso utente**: "Come immagini il flusso tipico di un utente? (registrazione -> cosa fa -> obiettivo)"
   - Se emergono piu ruoli utente, chiedere: "Ci sono tipi diversi di utente con permessi diversi?"

4. **Vincoli**: "Ci sono vincoli particolari? (settore, compliance, integrazioni esterne, deadline)"
   - Questa domanda e opzionale — saltare se il contesto e gia chiaro

5. **Business model**: "C'e un modello di business? (gratis, freemium, abbonamento, per-seat, crediti a consumo)"
   - Se non c'e ancora un modello: "Va bene, possiamo configurare il billing dopo. Per ora lo disattiviamo?"

### Dopo ogni risposta
- Riformulare brevemente: "Quindi [riformulazione]. Corretto?"
- Annotare mentalmente: entita emerse, flussi, ruoli, vincoli
- Se qualcosa non e chiaro, fare una domanda follow-up prima di proseguire

### Domande follow-up (usare quando servono)
- "Quando dici [termine], intendi [interpretazione A] o [interpretazione B]?"
- "Questa funzionalita e core (deve esserci al lancio) o nice-to-have (puo venire dopo)?"
- "Chi gestisce [entita]? L'admin dell'organizzazione o ogni membro?"
- "Come si relaziona [entita A] con [entita B]?"

### Riepilogo Discovery
Al termine, presentare:

"Da quello che mi hai descritto, il progetto **[nome]** e [descrizione breve].

**Entita principali identificate:**
- [Entita 1] — [descrizione breve]
- [Entita 2] — [descrizione breve]

**Flussi chiave:**
1. [Flusso 1]
2. [Flusso 2]

**Ruoli utente:**
- [Ruolo 1] — [cosa puo fare]

Confermi? Vuoi aggiungere o modificare qualcosa?"

Attendere conferma prima di passare alla Fase 2.
```

- [ ] **Step 3: Write Phase 2 — Structuring**

```markdown
## Fase 2 — Strutturazione (domande mirate)

Obiettivo: definire il dettaglio tecnico per ogni entita e configurare il kit.

### 2a. Configurazione moduli del kit

Leggere `docs/MODULES.md` e presentare:

"Il kit include questi moduli. Per ognuno ti do un consiglio basato su quello che mi hai descritto:"

| Modulo | Default | Consiglio |
|--------|---------|-----------|
| Organizations | on | [consiglio basato su discovery — es. "Attivo, il tuo progetto e multi-tenant"] |
| Billing | on | [consiglio — es. "Attivo, hai menzionato abbonamenti"] |
| Leads | on | **Disattivare** (modulo demo, il codice resta come reference) |
| AI Chatbot | on | [consiglio — es. "Disattivare, non serve per questo progetto"] |
| Onboarding | on | [consiglio — es. "Attivo, utile per il primo accesso"] |
| Google Auth | off | [consiglio] |
| Public Registration | on | [consiglio] |
| Personal Account Only | off | [consiglio] |

"Confermi questa configurazione o vuoi cambiare qualcosa?"

Nota: spiegare le dipendenze se rilevanti (es. "Se disattivi billing, il chatbot AI perde il sistema crediti").

### 2b. Entita del nuovo progetto

Per OGNI entita emersa nella discovery, chiedere (una domanda alla volta):

**Domanda 1 — Campi**: "Quali sono i campi principali di **[entita]**?"
- Se l'utente da una lista generica, proporre campi concreti: "Pensavo a qualcosa come: nome (testo), stato (attivo/archiviato), [campo dominio]... Aggiungeresti altro?"
- Annotare: nome campo, tipo (testo, numero, enum, data, FK), obbligatorieta

**Domanda 2 — Permessi**: "Chi puo fare cosa con **[entita]**?"
- Proporre opzioni concrete:
  - "Tutti i membri leggono e creano, solo admin modificano e eliminano"
  - "Ogni membro vede solo i propri, admin vede tutto"
  - "Solo admin gestiscono tutto"
- Mappare a pattern RLS (vedi `questions.md` per la mappatura)

**Domanda 3 — Relazioni**: "**[Entita]** ha relazioni con altre entita?"
- Proporre basandosi sul contesto: "Immagino che [entita] appartenga all'organizzazione e possa essere assegnata a un membro. Corretto?"
- Annotare: FK, tipo relazione (1:N, 1:1), ON DELETE behavior

**Domanda 4 — Stati** (se applicabile): "**[Entita]** ha degli stati o un workflow?"
- Se si: chiedere gli stati e le transizioni
- Se no: saltare

### 2c. Pattern UI per ogni entita

Leggere `docs/UI-PATTERNS.md` e per ogni entita proporre:

"Per **[entita]** consiglio il **pattern [A/B/C/E]** ([nome pattern]) perche [motivo].
[Breve descrizione di come funzionerebbe per questa entita specifica]
Sei d'accordo o preferisci un altro approccio?"

### 2d. Personalizzazione progetto

- "Come si chiama l'app?" (per `config/app.config.ts`)
- "C'e gia un dominio?" (per `baseUrl`)
- "Per i piani billing, vuoi partire con Free/Pro/Lifetime come base o hai esigenze diverse?"
```

- [ ] **Step 4: Write Phase 3 — Validation and spec generation**

```markdown
## Fase 3 — Validazione e generazione spec

### 3a. Riepilogo completo

Presentare un riepilogo strutturato:

"Ecco il riepilogo completo del progetto **[nome]**:

**Configurazione kit:**
| Flag | Valore | Motivo |
|------|--------|--------|
| ... | ... | ... |

**Entita:**

**[Entita 1]**
- Campi: [lista]
- Permessi: [riassunto]
- Relazioni: [riassunto]
- Pattern UI: [A/B/C/E]

**[Entita 2]**
- ...

**Personalizzazione:**
- Nome app: [nome]
- Billing: [configurazione]

Tutto corretto? Vuoi modificare qualcosa?"

### 3b. Generazione spec

Una volta confermato:
1. Generare lo spec usando `.claude/skills/init-project/spec-template.md` come template
2. Salvare in: `docs/superpowers/specs/YYYY-MM-DD-init-[nome-progetto]-spec.md`
3. Chiedere all'utente di review-are lo spec file
4. Una volta approvato, invocare la skill `superpowers:writing-plans` per creare il piano di implementazione

"Spec generato e salvato in `docs/superpowers/specs/[file]`. Reviewalo e dimmi se vuoi modifiche prima di procedere con il piano di implementazione."
```

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/init-project/SKILL.md
git commit -m "feat: add init-project skill — main flow (discovery, structuring, spec generation)"
```

---

### Task 5: Create `.claude/skills/init-project/questions.md`

**Files:**
- Create: `.claude/skills/init-project/questions.md`

- [ ] **Step 1: Write the questions reference with response-to-decision mappings**

```markdown
# Reference Domande — Init Project

Guida di riferimento per le domande della skill init-project.
Organizzata per fase con mappatura risposte -> decisioni tecniche.

## Fase 1 — Discovery

### Domande obbligatorie
1. Descrizione progetto (cosa fa, per chi)
2. Funzionalita principali
3. Flusso utente tipico
5. Modello di business

### Domande opzionali
4. Vincoli (settore, compliance, integrazioni)

### Quando fare follow-up
- Risposta vaga ("un'app per gestire cose") -> "Puoi farmi un esempio concreto?"
- Emergono piu ruoli -> "Che differenze ci sono tra [ruolo A] e [ruolo B]?"
- Entita ambigua -> "Quando dici [X], intendi [A] o [B]?"
- Scope troppo ampio -> "Qual e la funzionalita piu importante per il lancio?"

### Pattern "non so ancora"
Se l'utente non sa rispondere:
- Business model: "Partiamo con billing disattivato, lo configuriamo dopo"
- Permessi: "Partiamo con il pattern base: tutti i membri leggono e creano, admin modificano e eliminano"
- Stati: "Partiamo senza workflow, aggiungiamo gli stati quando servono"

## Fase 2 — Mappatura risposte -> decisioni tecniche

### Permessi -> RLS policies

| Risposta utente | Pattern RLS |
|----------------|-------------|
| "Tutti i membri vedono tutto" | `is_organization_member(organization_id)` |
| "Ogni utente vede solo i suoi" | `user_id = auth.uid()` (SELECT), `is_organization_member(organization_id)` (INSERT) |
| "Admin vede tutto, member solo i propri" | `has_org_role(organization_id, 'admin') OR user_id = auth.uid()` |
| "Solo admin possono modificare" | SELECT: `is_organization_member(...)`, UPDATE/DELETE: `has_org_role(..., 'admin')` |
| "Solo il creatore e admin possono modificare" | `has_org_role(..., 'admin') OR created_by = auth.uid()` |
| "Solo owner puo eliminare" | DELETE: `has_org_role(..., 'owner')` |

### Relazioni -> Schema DB

| Risposta utente | Pattern DB |
|----------------|-----------|
| "Appartiene all'organizzazione" | `organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE` |
| "Puo essere assegnata a un membro" | `assigned_to_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` |
| "Creata da un utente" | `created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL` |
| "Ha un'entita padre" | `parent_id uuid REFERENCES parent_table(id) ON DELETE CASCADE` |
| "Relazione 1:1 con org" | `organization_id uuid PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE` (come organization_details) |

### Stati -> Enum + colonna

| Risposta utente | Pattern DB |
|----------------|-----------|
| "Ha degli stati" | `CREATE TYPE entity_status AS ENUM ('stato1', 'stato2', ...)` + colonna `status entity_status DEFAULT 'stato1'` + indice su status |
| "No stati" | Nessuna colonna status, nessun enum |
| "Bozza/pubblicato" | `CREATE TYPE entity_status AS ENUM ('draft', 'published', 'archived')` |

### Business model -> Feature flag

| Risposta utente | Configurazione |
|----------------|---------------|
| "Gratis" | `billing=false` |
| "Freemium" | `billing=true`, piano Free + piano Pro |
| "Solo a pagamento" | `billing=true`, `publicRegistration=false` o trial obbligatorio |
| "Per-seat" | `billing=true`, piano con `priceModel: 'per_seat'` |
| "Crediti a consumo" | `billing=true`, pacchetti crediti in billing.config.ts |

### Tipo progetto -> Feature flag

| Risposta utente | Configurazione |
|----------------|---------------|
| "Un utente = un account personale" | `personalAccountOnly=true`, `multiOrg=false` |
| "Organizzazioni con team" | `multiOrg=true` |
| "Solo su invito" | `publicRegistration=false` |
| "Login con Google" | `googleAuth=true` |

### Entita -> Pattern UI

| Caratteristiche entita | Pattern consigliato |
|----------------------|-------------------|
| Lista con CRUD, filtri, export | A — Tabella CRUD con Sheet |
| Impostazioni con sezioni | B — Settings a Tab |
| Selezione/overview visuale | C — Griglia Card |
| Flusso guidato (setup, creazione complessa) | E — Wizard Multi-step |
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/init-project/questions.md
git commit -m "feat: add init-project questions.md — response-to-decision mappings"
```

---

### Task 6: Create `.claude/skills/init-project/spec-template.md`

**Files:**
- Create: `.claude/skills/init-project/spec-template.md`

- [ ] **Step 1: Write the spec template**

```markdown
# Template Spec Progetto

Usare questo template per generare lo spec del nuovo progetto.
Sostituire tutti i placeholder `[...]` con i dati raccolti.

---

# Spec: [Nome Progetto]

Data: [YYYY-MM-DD]
Generato da: /init-project

## Panoramica

[Descrizione del progetto in 2-3 frasi: cosa fa, per chi, value proposition]

### Utenti target
- [Tipo utente 1] — [cosa fa nell'app]
- [Tipo utente 2] — [cosa fa nell'app]

## Configurazione Kit

### Feature Flag

| Flag | Valore | Motivo |
|------|--------|--------|
| `multiOrg` | [true/false] | [motivo] |
| `billing` | [true/false] | [motivo] |
| `leads` | false | Modulo demo disattivato |
| `aiChatbot` | [true/false] | [motivo] |
| `onboarding` | [true/false] | [motivo] |
| `publicRegistration` | [true/false] | [motivo] |
| `googleAuth` | [true/false] | [motivo] |
| `personalAccountOnly` | [true/false] | [motivo] |

### App Config

- **Nome**: [nome app]
- **Base URL**: [url o "da configurare"]
- **Billing**: [descrizione configurazione piani o "disattivato"]

## Entita

### [Nome Entita 1]

#### Descrizione
[Cosa rappresenta questa entita, 1-2 frasi]

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| id | uuid | PK | Auto-generated |
| organization_id | uuid FK | si | Riferimento organizzazione |
| [campo] | [tipo] | [si/no] | [note] |
| created_at | timestamptz | si | Auto-generated |
| updated_at | timestamptz | si | Auto-updated via trigger |

#### Permessi

| Azione | owner | admin | member | Note |
|--------|:-----:|:-----:|:------:|------|
| Lettura | ✅ | ✅ | [✅/Solo propri] | |
| Creazione | ✅ | ✅ | [✅/❌] | |
| Modifica | ✅ | ✅ | [Solo propri/❌] | |
| Eliminazione | ✅ | [✅/❌] | [❌] | |

#### Relazioni
- Appartiene a: `organization` (organization_id, ON DELETE CASCADE)
- [Altre relazioni]

#### Stati/Workflow
[Se presenti: lista stati con transizioni. Se assenti: "Nessun workflow"]

#### Pattern UI
- **Pattern**: [A/B/C/E] — [Nome pattern]
- **Note**: [Adattamenti specifici per questa entita]

### [Nome Entita 2]
[Stessa struttura di sopra]

## Flussi Utente

### Flusso 1: [Nome]
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Flusso 2: [Nome]
1. [Step 1]
2. [Step 2]

## Moduli del kit da utilizzare come reference

- **Lead module** — Pattern CRUD completo (tabella, router, schema, UI)
- **Organization settings** — Pattern settings a tab
- **Organizations grid** — Pattern griglia card
- **Onboarding** — Pattern wizard multi-step

Vedi `docs/MODULES.md` per la mappa completa.

## Note implementazione

- [Complessita specifiche]
- [Integrazioni esterne necessarie]
- [Edge case da considerare]
- [Ordine consigliato di implementazione delle entita]
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/init-project/spec-template.md
git commit -m "feat: add init-project spec-template.md — template for generated project specs"
```

---

### Task 7: Final verification and integration commit

**Files:**
- Verify: all 6 files created
- Verify: cross-references between files are correct

- [ ] **Step 1: Verify all files exist**

Run:
```bash
ls -la docs/MODULES.md docs/UI-PATTERNS.md docs/ADDING-ENTITY.md .claude/skills/init-project/SKILL.md .claude/skills/init-project/questions.md .claude/skills/init-project/spec-template.md
```

Expected: all 6 files exist

- [ ] **Step 2: Verify cross-references**

Check that:
- `MODULES.md` links to `UI-PATTERNS.md`, `ADDING-ENTITY.md`, `EXTENDING-ORGANIZATION.md`, `FEATURE-FLAGS.md`
- `UI-PATTERNS.md` links to `MODULES.md`, `ADDING-ENTITY.md`
- `ADDING-ENTITY.md` links to `UI-PATTERNS.md`, `FEATURE-FLAGS.md`, references lead module files
- `SKILL.md` references all 3 docs + `CLAUDE.md`
- All file paths referenced in docs actually exist in the repo

Run:
```bash
# Verify referenced component files exist
ls components/organization/leads-table.tsx components/organization/leads-modal.tsx components/organization/leads-bulk-actions.tsx components/organization/organization-settings-tabs.tsx components/organization/organizations-grid.tsx components/organization/organization-menu-items.tsx
```

Expected: all files exist

- [ ] **Step 3: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors (markdown files are not linted by Biome, but verify no accidental code changes)

- [ ] **Step 4: Run typecheck to confirm no regressions**

Run:
```bash
npm run typecheck
```

Expected: PASS with no errors

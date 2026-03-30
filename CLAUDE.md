# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Multi-tenant SaaS starter kit with authentication, billing, organizations, lead management, and AI chat.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **API**: tRPC v11 for type-safe APIs
- **Database**: PostgreSQL via Supabase (client JS + RLS)
- **Auth**: Supabase Auth (email/password, Google OAuth, 2FA/TOTP)
- **Storage**: Supabase Storage (images bucket)
- **Billing**: Stripe (subscriptions, per-seat, one-time)
- **UI**: Tailwind CSS 4, Shadcn UI, Radix, Lucide React
- **Forms**: React Hook Form + Zod
- **Content**: Content Collections (blog, legal pages, docs)
- **Email**: Resend + React Email
- **Testing**: Vitest (unit), Playwright (E2E)

## Essential Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run db:start      # Start Supabase locally (Docker)
npm run db:stop       # Stop Supabase
npm run db:reset      # Reset DB from migrations
npm run db:studio     # Supabase Studio GUI
npm run db:typegen    # Regenerate database.types.ts
npm run db:migrate    # Create new migration
npm run lint          # Biome linter
npm run typecheck     # Type check
npm run test          # Unit tests
npm run e2e           # E2E tests
npm run stripe:listen # Stripe webhook listener
```

## Project Structure

```
app/
├── (marketing)/          # Public pages (blog, legal)
├── (saas)/
│   ├── auth/             # Sign in/up/callback/confirm
│   └── dashboard/        # Protected app
│       ├── admin/        # Platform admin
│       └── organization/ # Org features
└── api/                  # API routes (webhooks, org switch)
components/               # React components
config/                   # App, billing config
lib/
├── auth/                 # Auth helpers (server.ts, client.ts)
├── supabase/             # Supabase clients (client, server, admin)
├── billing/              # Stripe integration
├── storage/              # Supabase Storage helpers
└── email/                # Email templates
supabase/
├── config.toml           # Supabase local config
├── schemas/              # SQL schema files (reference)
└── migrations/           # Database migrations
schemas/                  # Zod validation schemas
trpc/routers/             # tRPC endpoints
```

## Core Patterns

### tRPC Procedures

```typescript
publicProcedure; // No auth
protectedProcedure; // Requires login
protectedAdminProcedure; // Requires platform admin
protectedOrganizationProcedure; // Requires org membership
```

### Supabase Clients

```typescript
// Browser client (components)
import { createClient } from "@/lib/supabase/client";

// Server client (Server Components, tRPC, API routes)
import { createClient } from "@/lib/supabase/server";

// Admin client (bypasses RLS - webhooks, admin ops)
// ⚠️ Local dev: SUPABASE_SERVICE_ROLE_KEY must be JWT format, not sb_secret_ format
import { createAdminClient } from "@/lib/supabase/admin";
```

### Admin Client e Trigger (CRITICAL)

L'admin client (service_role) bypassa le **RLS policies** ma **NON i trigger PostgreSQL**. I trigger che usano `auth.uid()` o `is_platform_admin()` falliranno o ripristineranno silenziosamente i valori perché `auth.uid()` è `NULL` con il service_role.

**Trigger protetti (già fixati):**
- `protect_user_profile_fields`: controlla `current_setting('role')` per permettere `service_role`
- `prevent_owner_removal`: controlla se l'org esiste ancora (per permettere CASCADE delete)

**Quando scrivi nuovi trigger:**
```sql
-- ✅ CORRETTO: controlla prima il service_role
IF current_setting('role', true) IN ('service_role', 'supabase_admin') THEN
  RETURN new;
END IF;
-- Poi controlla auth.uid() per utenti normali
IF NOT public.is_platform_admin() THEN ...

-- ❌ SBAGLIATO: auth.uid() è NULL con service_role
IF NOT public.is_platform_admin() THEN ...
```

**Quando usi l'admin client su tabelle con trigger:** verifica che i trigger non blocchino o revertino silenziosamente le modifiche. I trigger BEFORE UPDATE/DELETE sono i più pericolosi perché possono modificare `new.*` senza errore visibile.

### Multi-Tenant Data (CRITICAL)

RLS policies enforce isolation at DB level. In tRPC, use the context's Supabase client (which carries the user's JWT):

```typescript
// ✅ CORRECT - RLS filters automatically by org membership
const { data: leads } = await ctx.supabase
  .from("lead")
  .select("*")
  .eq("organization_id", ctx.organization.id);

// ❌ WRONG - Never use adminClient for user-facing queries (bypasses RLS)
const { data: leads } = await adminClient.from("lead").select("*");
```

### RLS + PostgREST Gotcha

`.insert().select().single()` requires BOTH the INSERT **and** SELECT policies to pass.
If a user creates a row but can't read it yet (e.g., org creator isn't a member yet),
use a **SECURITY DEFINER** function instead. See `create_organization_with_owner` as example.

### Database Column Naming

Supabase uses **snake_case** for all columns. Always use snake_case in queries and types:

```typescript
// ✅ organization_id, created_at, user_id
// ❌ organizationId, createdAt, userId
```

### Role System

1. **Platform Role** (`user_profile.role`): `user` | `admin`
2. **Organization Role** (`member.role`): `owner` | `admin` | `member`

```typescript
// Platform admin
if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

// Org admin
if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

**Database helper functions** (usare nelle RLS policies, non nel codice TS):

| Funzione | Scopo |
|----------|-------|
| `is_platform_admin()` | `true` se `user_profile.role = 'admin'` per `auth.uid()` |
| `has_org_role(org_id, role)` | Verifica membership + ruolo con ereditarieta (`member` < `admin` < `owner`) |

**Trigger `protect_user_profile_fields`**: impedisce a utenti non-admin di modificare `role`, `banned`, `ban_reason`, `ban_expires` via UPDATE diretto. Il primo admin va creato via SQL Editor (superuser).

**Cross-livello**: `isOrganizationAdmin()` in `lib/auth/utils.ts` tratta i platform admin come admin di qualsiasi org.

**Pattern RLS per ruolo** (admin+ vede tutto, member solo il suo):
```sql
-- admin+ vede tutte le risorse, member solo la propria
CREATE POLICY "read" ON resource FOR SELECT TO authenticated
  USING (has_org_role(organization_id, 'admin') OR user_id = auth.uid());
```

Vedi [ROLES.md](./ROLES.md) per documentazione completa.

### Authentication

```typescript
// Client
import { useSession } from "@/hooks/use-session";
const { user, isPending } = useSession();

// Server (reads JWT claims — fast but can be stale)
import { getUser } from "@/lib/auth/server";
const user = await getUser();
```

### Active Organization

Stored in a **cookie** (`active-organization-id`), NOT in JWT metadata.
- Set via `POST /api/organization/switch` (verifies membership)
- Read via `cookies().get("active-organization-id")` on server
- The org layout and `getSession()` both read from this cookie

### User Metadata Keys

Supabase Auth `user_metadata` uses **camelCase** (JS convention):
```typescript
// ✅ onboardingComplete, image, name
// ❌ onboarding_complete, avatar_url
```
DB columns use snake_case. Don't mix them up when reading from different sources.

### Session Refresh

After updating user metadata, call `refreshSession()` (not `getUser()`) to update the JWT in cookies:
```typescript
await supabase.auth.refreshSession(); // updates JWT cookie
await utils.user.getSession.invalidate(); // refetch tRPC query
```

### Forms

```typescript
import { useZodForm } from "@/hooks/use-zod-form";
const form = useZodForm({ schema, defaultValues: {} });
```

### Logging (Object first, message second)

```typescript
import { logger } from "@/lib/logger";
logger.info({ userId, action }, "User performed action");
logger.error({ error }, "Operation failed");
// NEVER use console.log
```

## Lingua dell'interfaccia: Italiano

L'intera UI è tradotta in italiano. Non esiste un sistema i18n: tutte le stringhe sono hardcoded nei file.

### Regole per nuove stringhe

- **Scrivi sempre in italiano** ogni testo visibile all'utente (label, bottoni, toast, errori, placeholder, metadata pagine, email)
- **Tono**: informale (tu), moderno, naturale per il web
- **Termini mantenuti in inglese** (uso comune nel web italiano): Email, Password, Dashboard, Blog, Lead, FAQ, CSV, Excel, AI, Stripe, Admin, Upgrade, Pro, Home, Account, Login (come sostantivo)
- **Locale**: usare `it-IT` per formattazione date e valute
- **Root layout**: `<html lang="it">`
- **Errori Supabase**: vengono tradotti tramite `translateSupabaseError()` in `lib/auth/constants.ts`. Se Supabase introduce nuovi messaggi, aggiungerli alla mappa `supabaseErrorTranslations`

### Esempi

| Inglese | Italiano |
|---------|----------|
| Sign in | Accedi |
| Sign up | Registrati |
| Sign out | Esci |
| Settings | Impostazioni |
| Members | Membri |
| Organization | Organizzazione |
| Save | Salva |
| Cancel | Annulla |
| Delete | Elimina |
| Something went wrong | Si è verificato un errore |

## Storage (Supabase Storage)

### Path Convention

Upload paths use `{userId}/{uuid}.png` — the first folder segment MUST be the uploading user's ID. RLS policies on `storage.objects` enforce this via `(storage.foldername(name))[1] = auth.uid()::text` for INSERT, UPDATE, and DELETE.

```typescript
// ✅ Avatar
const path = `${user.id}/${uuid()}.png`;

// ✅ Org logo (owned by uploading user)
const path = `${user.id}/${uuid()}.png`;

// ❌ Flat path — breaks RLS (foldername returns empty)
const path = `${user.id}-${uuid()}.png`;
```

### Cleanup Strategy

Delete the old file before uploading a new one. Path is always unique (UUID), so `upsert` is unnecessary:

```typescript
// Delete old file if it exists
if (currentPath && !currentPath.startsWith("http")) {
  await supabase.storage.from("images").remove([currentPath]);
}
// Upload new file (no upsert needed)
await supabase.storage.from("images").upload(newPath, blob, { contentType: "image/png" });
```

### Where Paths Are Stored

- **User avatar**: `auth.users.raw_user_meta_data.image` (via `supabase.auth.updateUser({ data: { image: path } })`)
- **Org logo**: `organization.logo` column (via `management.updateLogo` tRPC mutation)
- `useStorage()` hook resolves paths to full public URLs at runtime

## Email (Resend + React Email)

Templates in `lib/email/templates/`, sending functions in `lib/email/emails.ts`. Pattern for sending:

```typescript
import { sendOrganizationInvitationEmail } from "@/lib/email/emails";

// Fire-and-forget (don't block the mutation response)
sendSomeEmail({ recipient, ...props }).catch((err) => {
  logger.error({ error: err }, "Failed to send email");
});
```

Requires `RESEND_API_KEY` and `EMAIL_FROM` env vars. Dev preview: `npm run email:dev`.

## Data Shape: Supabase → Frontend

Supabase returns **snake_case**. Frontend interfaces consuming raw query results must use snake_case too. Only convert to camelCase at boundaries (e.g., passing data to a form/modal that uses camelCase Zod schemas):

```typescript
// ✅ Interface matching Supabase response
interface Lead {
  first_name: string;
  created_at: string;  // string, not Date — Supabase returns ISO strings
}

// ✅ Map to camelCase only when passing to forms
NiceModal.show(LeadsModal, {
  lead: { firstName: row.first_name, ... }
});
```

### PostgREST Joins

Foreign key hints must match the actual FK target. Check `list_tables` verbose output:

```typescript
// ❌ FK points to auth.users, not user_profile — PostgREST error
.select("*, assigned_to:user_profile!lead_assigned_to_id_fkey(id, name)")

// ✅ Only join tables that have a direct FK relationship
.select("*")
```

`user_profile` only has: id, role, onboarding_complete, banned, ban_reason, ban_expires, created_at, updated_at. It does NOT have name, email, or image (those are in `auth.users.raw_user_meta_data`).

## Feature Flags

Il progetto e modulare tramite feature flags in `.env`. Ogni flag e `NEXT_PUBLIC_FEATURE_*` e richiede rebuild.

```env
NEXT_PUBLIC_FEATURE_BILLING=true              # Stripe, abbonamenti, crediti
NEXT_PUBLIC_FEATURE_LEADS=true                # Gestione lead
NEXT_PUBLIC_FEATURE_AI_CHATBOT=true           # Chatbot AI
NEXT_PUBLIC_FEATURE_ONBOARDING=true           # Wizard onboarding
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION=true  # Signup pubblico
NEXT_PUBLIC_FEATURE_MULTI_ORG=true            # Multi-organizzazione
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY=false  # Solo account personali
NEXT_PUBLIC_FEATURE_GOOGLE_AUTH=false             # Login/registrazione con Google OAuth
```

### Guard a 3 livelli

Ogni feature disabilitata e protetta su UI, API e middleware:

```typescript
// UI: nascondere componenti
import { FeatureGate } from "@/components/feature-gate";
<FeatureGate feature="billing"><BillingSection /></FeatureGate>

// API: bloccare procedure tRPC
import { featureGuard } from "@/trpc/init";
list: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .query(...)

// Middleware: proxy.ts redirige rotte disabilitate
```

### Vincoli

- `personalAccountOnly=true` forza `multiOrg=false`
- `billing=false` blocca anche crediti AI
- `publicRegistration=false` richiede admin panel per creare utenti
- `googleAuth=true` richiede `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurati

### Aggiungere un flag

1. `lib/env.ts` — aggiungi variabile (client + runtimeEnv)
2. `config/features.config.ts` — aggiungi al config e al tipo
3. `featureGuard("nome")` nei router tRPC
4. `<FeatureGate feature="nome">` nella UI
5. Redirect in `proxy.ts` se necessario

Vedi [docs/FEATURE-FLAGS.md](./docs/FEATURE-FLAGS.md) per documentazione completa.

## Code Style

- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions: `camelCase`
- Never use `any` - use `unknown` or proper types
- Use existing UI from `@/components/ui/`
- All inputs validated with Zod

## Key Files

| File                              | Purpose                          |
| --------------------------------- | -------------------------------- |
| `config/app.config.ts`            | App settings                     |
| `config/features.config.ts`       | Feature flags config             |
| `config/billing.config.ts`        | Plans, pricing                   |
| `supabase/config.toml`            | Supabase local config            |
| `lib/supabase/database.types.ts`  | Auto-generated DB types          |
| `trpc/init.ts`                    | tRPC setup + procedures + guards |
| `proxy.ts`                        | Auth middleware (ban, onboarding, feature flags) |
| `components/feature-gate.tsx`     | Conditional UI component         |
| `app/api/organization/switch/`    | Set active org cookie            |

## Before Committing

```bash
npm run lint && npm run typecheck
```

Never use `--no-verify` to skip hooks.

## Related Docs

- [AGENTS.md](./AGENTS.md) - Full guidelines
- [ROLES.md](./ROLES.md) - Role system
- [QUICKSTART.md](./QUICKSTART.md) - Setup guide
- [docs/FEATURE-FLAGS.md](./docs/FEATURE-FLAGS.md) - Feature flags (documentazione completa)
- [docs/EXTENDING-ORGANIZATION.md](./docs/EXTENDING-ORGANIZATION.md) - Estendere i dati organizzazione

# Supabase Migration - Piano Indice

**Data:** 2026-03-27
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md`

## Overview

Migrazione completa del progetto achromatic-pro da Better Auth + Prisma + S3 a Supabase Auth + Supabase client JS + Supabase Storage + RLS.

## Piani di implementazione

Ogni fase ha il proprio piano dettagliato. Eseguire in ordine (le dipendenze sono indicate).

| # | Piano | Dipende da | Task | Tempo stimato |
|---|-------|------------|------|---------------|
| 0 | [Phase 0: Supabase Setup](./phase-0-supabase-setup.md) | - | 1-7 | 1 giorno |
| 1 | [Phase 1: Supabase Clients](./phase-1-supabase-clients.md) | Phase 0 | 8-9 | 1 giorno |
| 2 | [Phase 2: Auth Migration](./phase-2-auth-migration.md) | Phase 1 | 10-15 | 3-4 giorni |
| 3 | [Phase 3: Data Access Migration](./phase-3-data-access-migration.md) | Phase 2 | 16-22 | 3-4 giorni |
| 4 | [Phase 4: RLS Verification](./phase-4-rls-verification.md) | Phase 3 | 23 | 1 giorno |
| 5 | [Phase 5: Storage Migration](./phase-5-storage-migration.md) | Phase 1 | 24 | 1 giorno |
| 6 | [Phase 6: Cleanup](./phase-6-cleanup.md) | Tutte | 25 | 1 giorno |

**Tempo totale stimato: ~11-14 giorni**

### Grafo delle dipendenze

```
Phase 0 (Setup)
  └── Phase 1 (Clients)
        ├── Phase 2 (Auth) ← PERCORSO CRITICO
        │     └── Phase 3 (Data Access)
        │           └── Phase 4 (RLS)
        └── Phase 5 (Storage) ← parallelizzabile con Phase 3
              └── Phase 6 (Cleanup) ← dopo tutte le fasi
```

### Fasi successive (post-migrazione)

| Fase | Cosa | Quando |
|------|------|--------|
| 7 | Re-integrazione billing completa | Quando pronto per monetizzare |
| 8 | MFA enforcement (policy restrittive) | Quando vuoi imporre MFA |
| 9 | Impersonation | Quando serve per support |
| 10 | Realtime notifications | Quando serve |

## File Structure completa

### File da creare

```
supabase/
├── config.toml
├── schemas/
│   ├── 00-extensions.sql
│   ├── 01-enums.sql
│   ├── 02-user-profile.sql
│   ├── 03-organization.sql
│   ├── 04-member.sql
│   ├── 05-invitation.sql
│   ├── 06-lead.sql
│   ├── 07-ai-chat.sql
│   ├── 08-billing.sql
│   ├── 09-credits.sql
│   ├── 10-functions.sql
│   ├── 11-triggers.sql
│   ├── 12-mfa.sql
│   ├── 13-storage.sql
│   └── 14-seed.sql

lib/supabase/
├── client.ts
├── server.ts
├── proxy.ts
├── admin.ts
├── index.ts
└── database.types.ts

lib/storage/storage.ts

app/(saas)/auth/callback/route.ts
app/(saas)/auth/confirm/route.ts
```

### File da modificare

```
proxy.ts
lib/env.ts
lib/auth/server.ts
lib/auth/client.ts
lib/auth/constants.ts
lib/auth/utils.ts
hooks/use-session.tsx
trpc/init.ts
trpc/routers/user/index.ts
trpc/routers/organization/index.ts
trpc/routers/organization/organization-lead-router.ts
trpc/routers/organization/organization-ai-router.ts
trpc/routers/organization/organization-credit-router.ts
trpc/routers/organization/organization-subscription-router.ts
trpc/routers/admin/admin-user-router.ts
trpc/routers/admin/admin-organization-router.ts
trpc/routers/app.ts
app/api/ai/chat/route.ts
app/api/webhooks/stripe/route.ts
lib/billing/credits.ts
lib/billing/queries.ts
lib/billing/customer.ts
lib/billing/seat-sync.ts
lib/billing/guards.ts
lib/storage/index.ts
hooks/use-storage.tsx
.env.example
package.json
CLAUDE.md
AGENTS.md
```

### File da eliminare

```
lib/auth/index.ts
lib/auth/oauth-providers.tsx
lib/db/prisma.ts
lib/db/prisma-where.ts
lib/db/index.ts
lib/storage/s3.ts
config/storage.config.ts
app/api/auth/[...all]/route.ts
app/storage/[...path]/route.ts
trpc/routers/storage/index.ts
prisma/schema.prisma
prisma/migrations/
prisma.config.ts
```

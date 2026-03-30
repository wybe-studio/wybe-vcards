# Supabase Migration - Recap delle modifiche

**Data:** 2026-03-27
**Commit iniziale:** `6d09a01` (snapshot pre-migrazione)
**Commit finale:** `be551c9` (cleanup completato)
**Totale:** 20 commit, 117 file modificati, +7044 / -5092 righe

---

## Cosa e' stato sostituito

| Prima | Dopo |
|-------|------|
| Better Auth (auth) | Supabase Auth |
| Prisma ORM (database) | Supabase client JS (@supabase/ssr) |
| S3/Cloudflare R2 (storage) | Supabase Storage |
| Sessioni server-side (cookie custom) | JWT con getClaims() (verifica locale) |
| Multi-tenancy solo applicativa | RLS database + applicativa (defense in depth) |

## Pacchetti rimossi

- `better-auth`, `@better-fetch/fetch`
- `@prisma/client`, `@prisma/adapter-pg`, `pg`, `prisma`
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

## Pacchetti aggiunti

- `@supabase/ssr` (client browser/server con cookie handling)
- `@supabase/supabase-js` (client base + admin)

## File eliminati

| File/Cartella | Era |
|---------------|-----|
| `lib/auth/index.ts` | Config Better Auth (373 righe) |
| `lib/auth/oauth-providers.tsx` | Provider OAuth Better Auth |
| `lib/db/` (intera cartella) | Prisma singleton, helpers |
| `lib/storage/s3.ts` | Client S3 |
| `config/storage.config.ts` | Config bucket S3 |
| `prisma/` (intera cartella) | Schema, migrations |
| `prisma.config.ts` | Config Prisma 7 |
| `app/api/auth/[...all]/` | Catch-all Better Auth |
| `app/storage/[...path]/` | Proxy S3 signed URLs |
| `trpc/routers/storage/` | Endpoint per signed URL upload |
| `docker-compose.yml` | PostgreSQL standalone |
| `schemas/upload-schemas.ts` | Validazione bucket S3 |

## File creati

| File | Scopo |
|------|-------|
| `supabase/config.toml` | Config Supabase locale |
| `supabase/schemas/*.sql` (16 file) | Schema SQL completo con RLS |
| `supabase/migrations/` | Migration iniziale |
| `lib/supabase/client.ts` | Browser client |
| `lib/supabase/server.ts` | Server client (cookie-based) |
| `lib/supabase/admin.ts` | Admin client (bypassa RLS) |
| `lib/supabase/proxy.ts` | Session refresh per proxy |
| `lib/supabase/database.types.ts` | Tipi auto-generati (1010 righe) |
| `lib/supabase/index.ts` | Re-export |
| `lib/storage/storage.ts` | Helper Supabase Storage |
| `lib/enums.ts` | Enum locali (sostituiscono @prisma/client) |
| `app/(saas)/auth/callback/route.ts` | OAuth callback |
| `app/(saas)/auth/confirm/route.ts` | Email verification |
| `hooks/use-active-organization.tsx` | Context per org attiva |

## File modificati principali

| File | Tipo di modifica |
|------|-----------------|
| `proxy.ts` | Riscritto: Better Auth session → getClaims() |
| `lib/auth/server.ts` | Riscritto: getSession → getUser con getClaims() |
| `lib/auth/client.ts` | Riscritto: Better Auth client → Supabase client |
| `hooks/use-session.tsx` | Riscritto: per Supabase onAuthStateChange |
| `trpc/init.ts` | Riscritto: 4 procedure types con ctx.supabase |
| `lib/env.ts` | Aggiornato: nuove env vars Supabase |
| `.env.example` | Aggiornato: rimosse vars vecchie, aggiunte Supabase |
| `trpc/routers/organization/*` | Tutte le query da Prisma a Supabase |
| `trpc/routers/admin/*` | Tutte le query con admin client |
| `lib/billing/*` | credits, queries, customer, seat-sync, guards, sync |
| `app/api/webhooks/stripe/route.ts` | Webhook handler con admin client |
| `app/api/ai/chat/route.ts` | AI chat con Supabase queries + rpc() |
| Tutte le pagine auth | Sign-in/up/reset/MFA adattate per Supabase |
| Componenti organizzazione | Enums da @prisma/client a lib/enums |

## Database: 14 tabelle con RLS

| Tabella | Policy | Ruolo accesso |
|---------|--------|---------------|
| user_profile | 2 | Proprio profilo + admin |
| organization | 4 | Membri + admin + owner |
| member | 4 | Membri stessa org |
| invitation | 3 | Membri read, admin write |
| lead | 1 (ALL) | Membri org |
| ai_chat | 1 (ALL) | Membri org |
| credit_balance | 1 (ALL) | Membri org |
| credit_transaction | 1 (ALL) | Membri org |
| credit_deduction_failure | 1 | Membri read |
| subscription | 1 | Membri read |
| subscription_item | 1 | Membri read |
| order | 1 | Membri read |
| order_item | 1 | Membri read |
| billing_event | 1 | Membri read |

**8 funzioni SQL:** is_organization_member, has_org_role, is_platform_admin, is_mfa_compliant, deduct_credits, add_credits, list_ai_chats, sync_organization_seats

**Trigger:** handle_new_user (auto-create profile), set_updated_at (11 tabelle), prevent_owner_removal, protect_user_profile_fields

---

## Fase post-strutturale (Priorita' 1-3)

### Errori TypeScript risolti (97 → 0)

Tutti i riferimenti camelCase nei file migrati sono stati convertiti a snake_case per allinearsi ai tipi generati da Supabase (`database.types.ts`). Approccio scelto: **B) aggiornare i componenti** (coerenza diretta con il DB).

| Categoria | Errori | Fix applicato |
|-----------|--------|---------------|
| snake_case mismatch (TS2339/TS2551) | 72 | Property access aggiornate |
| Type argument errors (TS2345) | 9 | Tipi allineati a Supabase Row types |
| Implicit any (TS7006) | 9 | Tipi espliciti aggiunti |
| Module not found (TS2307) | 3 | Import aggiornati (Prisma → Supabase) |
| `never` type issues | 4 | `NonNullable<>` per map tipizzazione |

**File piu' modificati:**
- `trpc/routers/organization/organization-subscription-router.ts` (24 fix)
- `trpc/routers/admin/admin-organization-router.ts` (8 fix)
- `components/organization/organization-switcher.tsx` (8 fix)
- `lib/auth/server.ts` (7 fix)
- `tests/support/trpc-utils.ts` (6 fix - mock Supabase client)

### Organization CRUD implementato

Creato `trpc/routers/organization/organization-management-router.ts` con tutte le operazioni che erano stub dopo la rimozione di Better Auth:

| Operazione | Procedura tRPC | Ruolo minimo |
|------------|----------------|--------------|
| Aggiorna nome/metadata | `organization.management.update` | admin |
| Aggiorna logo | `organization.management.updateLogo` | admin |
| Elimina organizzazione | `organization.management.delete` | owner |
| Invita membro | `organization.management.inviteMember` | admin |
| Annulla invito | `organization.management.cancelInvitation` | admin |
| Accetta invito | `organization.management.acceptInvitation` | (utente invitato) |
| Rifiuta invito | `organization.management.rejectInvitation` | (utente invitato) |
| Aggiorna ruolo membro | `organization.management.updateMemberRole` | owner |
| Rimuovi membro | `organization.management.removeMember` | admin |
| Abbandona org | `organization.management.leave` | member (non owner) |
| Lista membri | `organization.management.listMembers` | member |
| Lista inviti | `organization.management.listInvitations` | admin |

### Active Organization switching

| Componente | File | Funzionalita' |
|------------|------|---------------|
| API route | `app/api/organization/switch/route.ts` | POST: setta/rimuove cookie `active-organization-id` con verifica membership |
| Switcher | `components/organization/organization-switcher.tsx` | Chiama API al cambio org, invalida cache React Query, naviga |

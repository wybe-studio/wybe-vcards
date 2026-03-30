# Come proseguire - Prossima sessione

**Ultimo aggiornamento:** 2026-03-27

---

## Stato attuale

- Errori TypeScript rimasti: **22** (erano 97+, ne sono stati risolti ~80)
- File nuovi creati e funzionanti: management router + switch API
- Commit da fare: ancora non committato

---

## Errori rimasti da risolvere (22)

### Gruppo A — Storage config eliminata (6 errori)

`config/storage.config.ts` è stato eliminato nella migrazione ma alcuni file lo importano ancora.

**File da aggiornare:**
- `app/storage/[...path]/route.ts` — proxy S3, va eliminato (era per signed URL S3, ora c'è Supabase Storage)
- `lib/storage/index.ts` — importa `./s3` (eliminato), va riscritto per usare solo Supabase Storage
- `components/admin/app-config/app-config-table.tsx` — rimuovere import `storage.config`
- `components/organization/organization-logo-card.tsx` — rimuovere import `storage.config` + fix `trpc.storage` (storage router eliminato)
- `components/user/user-avatar-upload.tsx` — stesso problema
- `hooks/use-storage.tsx` — rimuovere import `storage.config`

### Gruppo B — `organization.members` / `organization.invitations` non trovati (5 errori)

Il router `organization.get` restituisce i dati con join Supabase, ma la query usa `select("*, member(*), invitation(*)")` che ritorna chiavi `member` e `invitation` (non `members`/`invitations`). Il fix in `lib/auth/server.ts` con `members:member(*)` non è stato applicato al router in `index.ts`.

**File da aggiornare:**
- `trpc/routers/organization/index.ts` — nella procedura `get`, cambiare la select in:
  ```
  .select("*, members:member(*), invitations:invitation(*)")
  ```
- `components/organization/organization-members-table.tsx` — verifica accesso a `organization.members`
- `components/organization/organization-invitations-table.tsx` — verifica accesso a `organization.invitations`, fix `InvitationStatusIcon` (non è un componente valido)

### Gruppo C — Tipo `ActiveOrganizationData` incompatibile (1 errore)

`app/(saas)/dashboard/(sidebar)/organization/providers.tsx` — il tipo `ActiveOrganizationData` in `hooks/use-active-organization.tsx` usa ancora camelCase (`createdAt`, `userId`, `expiresAt`). Va aggiornato a snake_case per essere compatibile con i dati Supabase.

**File da aggiornare:**
- `hooks/use-active-organization.tsx` — aggiornare `ActiveOrganizationData` a snake_case

### Gruppo D — `MappedUser` / `session-provider` (2 errori)

- `components/session-provider.tsx` — il tipo `MappedUser` ha `createdAt: string | Date` ma il componente passa `createdAt: string | Date` (dovrebbe funzionare, verificare)
- `components/admin/users/users-table.tsx` — `string | null` non assegnabile a `string` rimasto

---

## Cosa dire a Claude per continuare

Aprire Claude Code e dire:

> "Leggi `docs/status/PROSSIMA-SESSIONE.md` e risolvi i 22 errori TypeScript rimasti, poi commita tutto"

Claude risolverà i 4 gruppi di errori nell'ordine indicato.

---

## Commit da fare (ordine consigliato)

Dopo aver risolto i 22 errori:

```bash
# 1. Fix TypeScript + nuove funzionalità
git add -A
git commit -m "fix: resolve all TypeScript errors post-Supabase migration

- Convert camelCase property accesses to snake_case (Supabase alignment)
- Fix Organization type to use snake_case fields
- Fix admin routers: NonNullable<> for subscription map typing
- Fix auth/server.ts: remove non-existent profile.name/image columns
- Fix billing queries: as const for status array
- Fix storage imports: remove orphaned S3/storage.config references
- Update test utilities to use Supabase mocks

feat: add organization management router (organization.management.*)
- update, updateLogo, delete, inviteMember, cancelInvitation
- acceptInvitation, rejectInvitation, updateMemberRole, removeMember
- leave, listMembers, listInvitations

feat: add active organization switching API (POST /api/organization/switch)
- Sets active-organization-id cookie with membership verification
- Organization switcher updated to call API on org change"
```

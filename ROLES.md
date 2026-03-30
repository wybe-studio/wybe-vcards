# Role System

Questo progetto utilizza un sistema a due livelli di ruoli: **piattaforma** e **organizzazione**.

## Panoramica

| Livello        | Tabella        | Colonna | Valori                         | Scopo                                  |
| -------------- | -------------- | ------- | ------------------------------ | -------------------------------------- |
| Piattaforma    | `user_profile` | `role`  | `user` \| `admin`              | Gestione globale (utenti, org, config) |
| Organizzazione | `member`       | `role`  | `owner` \| `admin` \| `member` | Gestione risorse dell'org              |

Non esiste un concetto di "superAdmin". L'admin di piattaforma (`user_profile.role = 'admin'`) e il livello piu alto.

## Ruolo di Piattaforma

### `user` (default)

- Accede alla propria dashboard
- Gestisce il proprio profilo
- Crea/partecipa a organizzazioni

### `admin`

- Tutto cio che puo fare un `user`
- Accede al pannello admin (`/dashboard/admin`)
- Gestisce tutti gli utenti (ban, creazione, promozione)
- Gestisce tutte le organizzazioni
- Visualizza configurazione piattaforma
- Cross-livello: un platform admin e automaticamente considerato admin in qualsiasi organizzazione (via `isOrganizationAdmin()` in `lib/auth/utils.ts`)

## Ruoli di Organizzazione

### `member`

- Legge le risorse dell'org (lead, dati, ecc.)
- Crea nuove risorse
- Modifica le proprie risorse (dove applicabile)

### `admin`

- Tutto cio che puo fare un `member`
- Modifica/elimina qualsiasi risorsa dell'org
- Gestisce i membri (inviti, cambio ruolo a `member`)
- Gestisce abbonamenti e crediti

### `owner`

- Tutto cio che puo fare un `admin`
- Elimina l'organizzazione
- Promuove/declassa admin
- Trasferisce ownership
- Unico ruolo che puo gestire altri admin

## Protezioni Database

### Funzioni helper

| Funzione                              | Scopo                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `is_platform_admin()`                 | Ritorna `true` se `user_profile.role = 'admin'` per `auth.uid()`                       |
| `has_org_role(org_id, required_role)` | Verifica appartenenza e ruolo nell'org con ereditarieta (`member` < `admin` < `owner`) |

### CHECK constraint

```sql
-- user_profile: solo valori ammessi
CHECK (role IN ('user', 'admin'))

-- member: solo valori ammessi
CHECK (role IN ('owner', 'admin', 'member'))
```

### Trigger anti privilege-escalation

Il trigger `protect_user_profile_fields` (BEFORE UPDATE su `user_profile`) impedisce a utenti non-admin di modificare:

- `role`
- `banned`
- `ban_reason`
- `ban_expires`

Se un utente normale tenta di auto-promuoversi ad admin via query diretta, il trigger silenziosamente ripristina il valore originale.

### RLS policies su `user_profile`

- **SELECT**: proprio profilo (`id = auth.uid()`) oppure platform admin (`is_platform_admin()`)
- **UPDATE**: proprio profilo (`id = auth.uid()`) oppure platform admin (`is_platform_admin()`)
- **INSERT**: nessuna policy (creato dal trigger `on_auth_user_created` o da admin via `createAdminClient`)

## Protezioni tRPC

| Procedure                        | Verifica                               |
| -------------------------------- | -------------------------------------- |
| `protectedProcedure`             | Utente autenticato                     |
| `protectedAdminProcedure`        | `ctx.profile?.role === 'admin'`        |
| `protectedOrganizationProcedure` | Utente membro dell'org attiva (cookie) |

Per operazioni riservate ad admin/owner dell'org, il check e inline:

```typescript
if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

## Protezione UI

Il layout admin (`app/(saas)/dashboard/(sidebar)/admin/layout.tsx`) verifica server-side:

```typescript
const session = await getSession();
if (!session || session.user?.role !== "admin") {
  redirect("/dashboard");
}
```

## Pattern RLS per Ruolo

### Tutti i membri leggono, solo admin+ modificano/eliminano

```sql
-- SELECT: qualsiasi membro dell'org
CREATE POLICY "read" ON resource FOR SELECT TO authenticated
  USING (has_org_role(organization_id, 'member'));

-- INSERT: qualsiasi membro
CREATE POLICY "insert" ON resource FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'member'));

-- UPDATE: solo admin+
CREATE POLICY "update" ON resource FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'admin'));

-- DELETE: solo admin+
CREATE POLICY "delete" ON resource FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'admin'));
```

### Filtro per ownership (member vede solo il suo)

```sql
-- SELECT: admin+ vede tutto, member solo il suo
CREATE POLICY "read" ON resource FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()
  );

-- UPDATE: admin+ tutto, member solo il suo
CREATE POLICY "update" ON resource FOR UPDATE TO authenticated
  USING (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()
  );

-- DELETE: solo admin+
CREATE POLICY "delete" ON resource FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'admin'));
```

## Creare il Primo Admin

Il trigger `protect_user_profile_fields` crea un problema chicken-and-egg: serve un admin per promuovere un admin. Il primo admin va creato via SQL diretto (SQL Editor in Supabase Studio o MCP):

```sql
-- Disabilita il trigger
ALTER TABLE public.user_profile DISABLE TRIGGER protect_user_profile_fields_trigger;

-- Esegui l'update
UPDATE public.user_profile
SET role = 'admin'
WHERE id = '<uuid_utente>';

-- Riabilita il trigger
ALTER TABLE public.user_profile ENABLE TRIGGER protect_user_profile_fields_trigger;

```

Le query dal SQL Editor girano come superuser e bypassano trigger e RLS.

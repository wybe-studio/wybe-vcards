# Admin vCard/Physical Card Actions + 2FA Obbligatorio

**Data:** 2026-03-31
**Stato:** Approvato

## Obiettivo

1. Aggiungere azioni CRUD alle tabelle vCard e card fisiche nel pannello admin di piattaforma
2. Rendere il 2FA obbligatorio per tutti gli admin di piattaforma

## Decisioni di design

- **Mutation admin dedicate** — nuove procedure `protectedAdminProcedure` con `adminClient`, nessun riutilizzo delle mutation org
- **Icone inline** sulle righe delle tabelle (non dropdown menu)
- **Modale di conferma** per tutte le azioni distruttive (elimina, disabilita, disassocia, sospendi, archivia)
- **2FA enforcement a due livelli**: middleware (`proxy.ts`) + tRPC (`protectedAdminProcedure`)
- **Hard block** — admin senza 2FA viene rediretto forzatamente al setup, nessun grace period

---

## Parte 1: Azioni Admin sulle Tabelle

### 1.1 Tab vCard — Azioni per riga

Icone inline a fine riga nella tabella `org-vcards-tab.tsx`:

| Icona | Azione | Visibile quando | Conferma modale |
|-------|--------|-----------------|-----------------|
| `Pencil` | Modifica vCard | Sempre | No — apre modale edit |
| `PauseCircle` | Sospendi | status = `active` | Sì |
| `PlayCircle` | Riattiva | status = `suspended` | No |
| `Archive` | Archivia | status ≠ `archived` | Sì |
| `Trash2` | Elimina | Sempre | Sì (`ConfirmationModal`) |

#### Modale Edit vCard

Form con campi: `first_name`, `last_name`, `email`, `phone`, `job_title`, `slug`, `status`, `user_id`.
Schema Zod dedicato per validazione admin. L'admin può modificare qualsiasi campo.

### 1.2 Tab Card Fisiche — Azioni per riga

Icone inline a fine riga nella tabella `org-physical-cards-tab.tsx`:

| Icona | Azione | Visibile quando | Conferma modale |
|-------|--------|-----------------|-----------------|
| `Link` | Assegna a vCard | status = `free` | No — apre modale assegnazione |
| `Unlink` | Disassocia | status = `assigned` | Sì |
| `Ban` | Disabilita | status ≠ `disabled` | Sì |
| `CheckCircle` | Riabilita | status = `disabled` | No |

#### Modale Assegnazione Card

Combobox che cerca le vCard dell'organizzazione per nome. Mostra solo vCard attive senza card fisica già assegnata.

### 1.3 Backend — Nuove mutation admin

**Nuovo router:** `adminVcardRouter` in `trpc/routers/admin/admin-vcard-router.ts`

```
admin.vcard.update({ organizationId, vcardId, ...data })
admin.vcard.delete({ organizationId, vcardId })
```

**Mutation aggiunte a** `adminPhysicalCardRouter`:

```
admin.physicalCard.assign({ organizationId, cardId, vcardId })
admin.physicalCard.unassign({ organizationId, cardId })
admin.physicalCard.disable({ organizationId, cardId })
admin.physicalCard.enable({ organizationId, cardId })
```

#### Sicurezza delle mutation admin

Tutte le mutation:
- Usano `protectedAdminProcedure` (richiede `role = "admin"`)
- Usano `adminClient` (bypassa RLS)
- Validano **esplicitamente** che l'entità appartenga all'`organizationId` specificato (check in query, non RLS)
- Validano lo stato corrente dell'entità prima di applicare la transizione (es. non puoi disabilitare una card già disabilitata)
- Input validato con Zod
- Loggano l'azione con `logger.info({ adminId, organizationId, entityId, action }, "Admin action")`

### 1.4 Schema Zod

Nuovo file `schemas/admin-vcard-schemas.ts`:

```typescript
// Update vCard (admin) — tutti i campi opzionali tranne id
adminUpdateVcardSchema = z.object({
  organizationId: z.string().uuid(),
  vcardId: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
  status: z.enum(["active", "suspended", "archived"]).optional(),
  user_id: z.string().uuid().nullable().optional(),
})

// Delete vCard (admin)
adminDeleteVcardSchema = z.object({
  organizationId: z.string().uuid(),
  vcardId: z.string().uuid(),
})

// Physical card actions (admin)
adminPhysicalCardActionSchema = z.object({
  organizationId: z.string().uuid(),
  cardId: z.string().uuid(),
})

adminAssignCardSchema = adminPhysicalCardActionSchema.extend({
  vcardId: z.string().uuid(),
})
```

---

## Parte 2: 2FA Obbligatorio per Admin

### 2.1 Livello 1 — Middleware (`proxy.ts`)

Nuovo check nel middleware per rotte `/dashboard/admin/*`:

1. Verificare che l'utente sia platform admin (check `user_profile.role`)
2. Querying `auth.mfa_factors` via `supabase.auth.mfa.listFactors()` per verificare se ha almeno un fattore TOTP con `status = "verified"`
3. **Nessun fattore verificato** → redirect a `/dashboard/account/setup-2fa`
4. **Fattore verificato ma AAL1** (ha 2FA ma non usato in questa sessione) → redirect a `/auth/verify-otp`
5. **Fattore verificato e AAL2** → accesso consentito

Rotte esentate dal check: `/dashboard/account/setup-2fa`, `/dashboard/account` (per permettere la navigazione al setup).

### 2.2 Livello 2 — tRPC (`protectedAdminProcedure`)

Defense in depth nel middleware tRPC:

```typescript
// Dopo il check role === "admin"
const aal = ctx.session?.aal ?? "aal1";
const factors = await ctx.supabase.auth.mfa.listFactors();
const hasVerifiedFactor = factors.data?.totp?.some(f => f.status === "verified");

if (hasVerifiedFactor && aal !== "aal2") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Autenticazione a due fattori richiesta",
  });
}

if (!hasVerifiedFactor) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Configura l'autenticazione a due fattori per accedere alle funzionalità admin",
  });
}
```

### 2.3 Nuova pagina `/dashboard/account/setup-2fa`

Pagina bloccante (layout minimale, no sidebar):
- Messaggio: "Per accedere al pannello di amministrazione, è necessario configurare l'autenticazione a due fattori."
- Riusa la logica di `TwoFactorModal` ma in versione inline (non modale)
- Flow: verifica password → QR code TOTP → verifica codice
- Al completamento: `refreshSession()` + redirect a `/dashboard/admin`
- Nessun link "skip" o navigazione alternativa

### 2.4 Edge cases

| Scenario | Comportamento |
|----------|---------------|
| Admin disabilita 2FA dalle impostazioni | Al prossimo accesso admin → redirect a setup-2fa |
| Utente promosso ad admin senza 2FA | La promozione (`assignAdminRole`) funziona. Al primo accesso admin → redirect a setup-2fa |
| Admin con sessione AAL1 (es. session refresh) | Redirect a `/auth/verify-otp` per ri-verificare |
| Account OAuth (Google) | Il 2FA TOTP funziona indipendentemente dal metodo di login (Supabase MFA è separato dal provider) |

---

## File coinvolti

### Nuovi file
- `trpc/routers/admin/admin-vcard-router.ts` — router admin per vCard CRUD
- `schemas/admin-vcard-schemas.ts` — schemi Zod per le mutation admin
- `components/admin/organizations/admin-edit-vcard-modal.tsx` — modale edit vCard
- `components/admin/organizations/admin-assign-card-modal.tsx` — modale assegnazione card
- `app/(saas)/dashboard/(sidebar)/account/setup-2fa/page.tsx` — pagina setup 2FA obbligatorio

### File modificati
- `components/admin/organizations/org-vcards-tab.tsx` — aggiunta icone azione per riga
- `components/admin/organizations/org-physical-cards-tab.tsx` — aggiunta icone azione per riga
- `trpc/routers/admin/admin-physical-card-router.ts` — nuove mutation assign/unassign/disable/enable
- `trpc/routers/admin/index.ts` — registrazione nuovo `adminVcardRouter`
- `trpc/init.ts` — aggiunta check 2FA in `protectedAdminProcedure`
- `proxy.ts` — aggiunta check 2FA per rotte admin

### File non modificati
- Nessuna modifica ai router org — le mutation admin sono completamente separate
- Nessuna modifica allo schema DB — tutte le operazioni usano tabelle esistenti
- Nessuna modifica alle RLS policies — le mutation admin usano `adminClient`

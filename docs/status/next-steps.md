# Passaggi successivi

**Ultimo aggiornamento:** 2026-03-27
**Stato attuale:** Priorita' 1-3 completate. Build TypeScript funzionante (0 errori), Organization CRUD implementato, Active Organization switching funzionante.

---

## ~~Priorita' 1: Errori TypeScript~~ ✅ COMPLETATA

97 errori risolti in 20 file. Approccio B (snake_case nei componenti) adottato per coerenza con Supabase. Dettagli in `migration-recap.md`.

---

## ~~Priorita' 2: Organization CRUD~~ ✅ COMPLETATA

Tutte le operazioni implementate in `trpc/routers/organization/organization-management-router.ts`:
update, updateLogo, delete, inviteMember, cancelInvitation, acceptInvitation, rejectInvitation, updateMemberRole, removeMember, leave, listMembers, listInvitations.

Registrato come `organization.management.*` nel router principale.

---

## ~~Priorita' 3: Active Organization~~ ✅ COMPLETATA

- API route `POST /api/organization/switch` (setta cookie con verifica membership)
- Organization switcher aggiornato per chiamare l'API
- Invalidazione cache React Query al cambio org

---

## Priorita' 4: Admin Operations (funzionale, non bloccante)

| Operazione | Stato | Note |
|------------|-------|------|
| Ban/Unban utente | Parziale | Update `user_profile.banned` funziona, ma serve admin API per invalidare sessioni |
| Impersonare utente | Non implementato | Serve `adminClient.auth.admin.generateLink()` |
| Eliminare utente | Stub | Serve `adminClient.auth.admin.deleteUser()` |
| Verifica email manuale | Non implementato | Serve admin API |
| Set ruolo platform | Funzionante | Via `user_profile.role` update |

---

## Priorita' 5: Test suite

| Area | File | Cosa fare |
|------|------|-----------|
| Test utilities | `tests/support/trpc-utils.ts` | ✅ Aggiornato per Supabase |
| Test environment | `tests/support/setup-env.ts` | ✅ Aggiornato mock Supabase |
| Organization tests | `tests/trpc/routers/organization.test.ts` | ✅ Aggiornato import/mock. Da verificare esecuzione |
| Organization CRUD tests | Da creare | Test per il nuovo management router |
| E2E tests | `e2e/` | Verificare flussi auth con Supabase |

---

## Priorita' 6: Documentazione

| File | Cosa aggiornare |
|------|-----------------|
| `CLAUDE.md` | Tech stack, comandi, pattern (Prisma → Supabase) |
| `AGENTS.md` | Stessi aggiornamenti |
| `README.md` | Tech stack table |
| `README_DATABASE.md` | Riscrivere completamente per Supabase |
| `README_AUTH.md` | Riscrivere per Supabase Auth |
| `README_STORAGE.md` | Riscrivere per Supabase Storage |
| `README_QUICKSTART.md` | Aggiornare setup guide |
| `README_DEPLOYMENT.md` | Aggiornare per deploy con Supabase |

---

## Priorita' 7: Nice-to-have (post-lancio)

| Feature | Descrizione |
|---------|-------------|
| MFA enforcement | Attivare le policy restrittive in `11-mfa.sql` |
| Realtime | Supabase Realtime per notifiche live |
| Edge Functions | Per logica server-side specifica |
| Email templates Supabase | Personalizzare le email auth in Supabase Dashboard |
| Session revocation | Possibilita' di disconnettere altre sessioni |
| Email inviti | Collegare `inviteMember` a Resend per invio email |

---

## Ordine di esecuzione consigliato

```
1. Risolvere errori TypeScript (build funzionante)          ✅
   ↓
2. Implementare organization CRUD + active org switching     ✅
   ↓
3. Testare manualmente tutti i flussi (auth, org, lead, AI chat)
   ↓
4. Implementare admin operations
   ↓
5. Aggiornare test suite
   ↓
6. Aggiornare documentazione
   ↓
7. Deploy su Supabase cloud + Vercel
```

# Inventario Moduli

Documentazione completa di tutti i moduli disponibili nel kit SaaS. Ogni modulo include tabelle DB, procedure tRPC, pagine, componenti chiave, schema Zod, dipendenze e opzioni di personalizzazione.

---

## Indice moduli

| Modulo | Feature flag | Default | Dipendenze | Note |
|--------|-------------|---------|------------|------|
| [Auth](#auth) | sempre attivo | -- | -- | Autenticazione email/password, Google OAuth, 2FA |
| [Organizations](#organizations) | `multiOrg` | `true` | Auth | Multi-tenancy, membri, inviti |
| [Billing](#billing) | `billing` | `true` | Organizations | Stripe, abbonamenti, crediti AI |
| [Leads](#leads) | `leads` | `true` | Organizations | **Modulo reference per pattern CRUD** |
| [AI Chatbot](#ai-chatbot) | `aiChatbot` | `true` | Organizations, Billing (per crediti) | Chat AI multi-modello con crediti |
| [Onboarding](#onboarding) | `onboarding` | `true` | Auth | Wizard configurazione account |
| [Admin Panel](#admin-panel) | sempre attivo | -- | Auth | Gestione piattaforma (utenti, org) |
| [Contact Form](#contact-form) | sempre attivo | -- | -- | Modulo contatto pubblico con Turnstile |

---

## Feature flag aggiuntivi

| Flag | Env var | Default | Scopo |
|------|---------|---------|-------|
| `publicRegistration` | `NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION` | `true` | Abilita signup pubblico; se `false`, solo admin puo creare utenti |
| `googleAuth` | `NEXT_PUBLIC_FEATURE_GOOGLE_AUTH` | `false` | Login/registrazione con Google OAuth |
| `personalAccountOnly` | `NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY` | `false` | Solo account personali, niente organizzazioni multiple |

---

## Vincoli tra flag

- `personalAccountOnly=true` forza `multiOrg=false` (applicato in `config/features.config.ts`)
- `billing=false` blocca anche le procedure crediti AI (le procedure tRPC usano `featureGuard("billing")`)
- `publicRegistration=false` richiede il pannello admin per creare utenti
- `googleAuth=true` richiede `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurati in Supabase

---

## Auth

**sempre attivo**

Gestisce autenticazione utenti tramite Supabase Auth: email/password, Google OAuth (opzionale), verifica email, reset password, 2FA/TOTP, sessioni. Il profilo utente e separato in `user_profile` (dati di piattaforma) e `auth.users.raw_user_meta_data` (nome, immagine).

### Tabelle DB

- `user_profile` — `id` (FK a auth.users), `role` (user/admin), `onboarding_complete`, `banned`, `ban_reason`, `ban_expires`, `created_at`, `updated_at`
- `auth.users` (gestita da Supabase) — email, password hash, `raw_user_meta_data` (name, image, onboardingComplete)

### Router tRPC

- `user.getSession` — Restituisce la sessione corrente (publicProcedure)
- `user.getActiveSessions` — Lista sessioni attive dell'utente
- `user.getAccounts` — Lista identity provider collegati (email, Google, ecc.)
- `user.deleteAccount` — Elimina account utente (verifica ownership org prima)

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/auth/sign-in` | Pagina di accesso |
| `/auth/sign-up` | Pagina di registrazione |
| `/auth/forgot-password` | Richiesta reset password |
| `/auth/reset-password` | Form reset password |
| `/auth/callback` | Callback OAuth/magic link |
| `/auth/confirm` | Conferma email |
| `/auth/verify` | Verifica OTP/2FA |
| `/auth/banned` | Pagina utente bannato |
| `/dashboard/settings` | Impostazioni account utente |

### Componenti chiave

- `components/auth/sign-in-card.tsx` — Form di accesso con email/password e OAuth
- `components/auth/sign-up-card.tsx` — Form di registrazione
- `components/auth/forgot-password-card.tsx` — Form richiesta reset password
- `components/auth/reset-password-card.tsx` — Form reset password
- `components/auth/otp-card.tsx` — Verifica codice OTP/2FA
- `components/auth/banned-card.tsx` — Messaggio utente bannato
- `components/auth/social-signin-button.tsx` — Bottone login Google OAuth
- `components/auth/password-form-message.tsx` — Feedback requisiti password

### Schema Zod

- Validazione inline nei componenti auth (non in file schema separato)

### Dipendenze

- Richiede: nessuno
- Richiesto da: tutti gli altri moduli

### Personalizzazione

- `config/auth.config.ts` — redirect dopo login/logout, durata sessione, lunghezza minima password, origini trusted, abilitazione signup/social login
- `lib/auth/constants.ts` — mappa traduzione errori Supabase (`supabaseErrorTranslations`)
- Temi e stili nei componenti auth
- Google OAuth: configurabile via `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` + flag `googleAuth`

---

## Organizations

**feature flag: `multiOrg`**

Sistema multi-tenant: creazione organizzazioni, gestione membri con ruoli (owner/admin/member), inviti via email con scadenza 7 giorni, switch organizzazione attiva via cookie. Ogni risorsa e isolata per organizzazione tramite RLS.

### Tabelle DB

- `organization` — `id`, `name`, `slug`, `logo`, `metadata` (JSONB), `stripe_customer_id`, `created_at`, `updated_at`
- `member` — `id`, `organization_id`, `user_id`, `role` (owner/admin/member), `created_at`, `updated_at`
- `invitation` — `id`, `organization_id`, `email`, `role`, `inviter_id`, `status` (pending/accepted/rejected/canceled), `expires_at`, `created_at`

### Router tRPC

- `organization.list` — Lista organizzazioni dell'utente con conteggio membri
- `organization.get` — Dettaglio organizzazione con membri e inviti
- `organization.create` — Crea nuova organizzazione (protetto da `featureGuard("multiOrg")`)
- `organization.management.update` — Aggiorna nome/metadata org (admin+)
- `organization.management.updateLogo` — Aggiorna logo org (admin+)
- `organization.management.delete` — Elimina organizzazione (solo owner)
- `organization.management.inviteMember` — Invita membro via email (admin+)
- `organization.management.cancelInvitation` — Annulla invito pendente (admin+)
- `organization.management.acceptInvitation` — Accetta invito (utente invitato)
- `organization.management.rejectInvitation` — Rifiuta invito (utente invitato)
- `organization.management.updateMemberRole` — Cambia ruolo membro (solo owner)
- `organization.management.removeMember` — Rimuovi membro (admin+)
- `organization.management.leave` — Abbandona organizzazione (non owner)
- `organization.management.listMembers` — Lista membri dell'organizzazione
- `organization.management.listInvitations` — Lista inviti (admin+)

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/organization` | Dashboard organizzazione |
| `/dashboard/organization/settings` | Impostazioni org (nome, logo, membri, inviti, billing) |
| `/dashboard/organization-invitation/[id]` | Accetta/rifiuta invito |

### Componenti chiave

- `components/organization/organization-switcher.tsx` — Selettore org attiva nella sidebar
- `components/organization/organizations-grid.tsx` — Griglia organizzazioni utente
- `components/organization/create-organization-modal.tsx` — Modale creazione org
- `components/organization/organization-change-name-card.tsx` — Card cambio nome org
- `components/organization/organization-logo-card.tsx` — Card upload logo
- `components/organization/organization-logo.tsx` — Componente visualizzazione logo
- `components/organization/organization-members-card.tsx` — Card gestione membri
- `components/organization/organization-members-table.tsx` — Tabella membri
- `components/organization/organization-invite-member-card.tsx` — Card invito membro
- `components/organization/organization-invitations-table.tsx` — Tabella inviti
- `components/organization/organization-role-select.tsx` — Select ruolo membro
- `components/organization/organization-settings-tabs.tsx` — Tab impostazioni org
- `components/organization/organization-menu-items.tsx` — Voci menu org nella sidebar
- `components/organization/delete-organization-card.tsx` — Card eliminazione org

### Schema Zod

- `schemas/organization-schemas.ts` — `getOrganizationByIdSchema`, `createOrganizationSchema`, `updateOrganizationSchema`, `inviteMemberSchema`, `createOrganizationFormSchema`, `changeOrganizationNameSchema`

### Dipendenze

- Richiede: Auth
- Richiesto da: Billing, Leads, AI Chatbot

### Personalizzazione

- Metadata JSONB flessibile (max 20 chiavi) per dati custom per organizzazione
- Slug auto-generato da nome + nanoid
- Ruoli estendibili (attualmente owner/admin/member)
- Logo caricato su Supabase Storage (path `{userId}/{uuid}.png`)

---

## Billing

**feature flag: `billing`**

Integrazione Stripe completa: abbonamenti ricorrenti (mensili/annuali), pricing per-seat, ordini one-time (lifetime), trial period, upgrade/downgrade con prorating, portale clienti Stripe. Include sistema crediti per funzionalita AI con pacchetti acquistabili.

### Tabelle DB

- `subscription` — `id`, `organization_id`, `stripe_customer_id`, `stripe_price_id`, `status`, `quantity`, `current_period_end`, `cancel_at_period_end`, `trial_end`, `created_at`
- `order` — `id`, `organization_id`, `stripe_checkout_session_id`, `status`, `created_at`
- `order_item` — `id`, `order_id`, `stripe_price_id`, `quantity`, `amount`
- `credit_balance` — `organization_id`, `balance`, `lifetime_purchased`, `lifetime_granted`, `lifetime_used`
- `credit_transaction` — `id`, `organization_id`, `type`, `amount`, `balance_after`, `description`, `model`, `created_by`, `metadata`, `created_at`

### Router tRPC

**Subscription (`organization.subscription.*`)**:
- `subscription.getStatus` — Stato billing: piano attivo, abbonamento, trial
- `subscription.listSubscriptions` — Storico abbonamenti con paginazione
- `subscription.listOrders` — Storico ordini one-time con paginazione
- `subscription.listInvoices` — Fatture da Stripe
- `subscription.createCheckout` — Crea sessione checkout Stripe (abbonamento o one-time)
- `subscription.createPortalSession` — Crea sessione portale clienti Stripe
- `subscription.cancelSubscription` — Cancella abbonamento a fine periodo
- `subscription.reactivateSubscription` — Riattiva abbonamento in cancellazione
- `subscription.listPlans` — Lista piani disponibili dalla config
- `subscription.previewPlanChange` — Anteprima cambio piano con prorating
- `subscription.changePlan` — Cambia piano (upgrade/downgrade)
- `subscription.updateSeats` — Aggiorna numero posti (per-seat)
- `subscription.getSeatInfo` — Info posti: attuali, conteggio membri, necessita sync

**Crediti (`organization.credit.*`)**:
- `credit.getBalance` — Saldo crediti organizzazione
- `credit.getTransactions` — Storico transazioni crediti con paginazione
- `credit.getPackages` — Pacchetti crediti disponibili
- `credit.purchaseCredits` — Acquista pacchetto crediti via Stripe checkout

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/organization/settings?tab=subscription` | Gestione abbonamento |
| `/dashboard/organization/settings?tab=credits` | Gestione crediti AI |
| `/dashboard/choose-plan` | Selezione piano (primo acquisto) |
| `/(marketing)/pricing` | Pagina prezzi pubblica |

### Componenti chiave

- `components/billing/subscription-settings-tab.tsx` — Tab impostazioni abbonamento
- `components/billing/credits-settings-tab.tsx` — Tab impostazioni crediti
- `components/billing/current-plan-card.tsx` — Card piano attuale
- `components/billing/plan-selection.tsx` — Selezione piano con prezzi
- `components/billing/pricing-card.tsx` — Card singolo piano
- `components/billing/pricing-table.tsx` — Tabella comparativa piani
- `components/billing/purchase-credits-modal.tsx` — Modale acquisto crediti
- `components/billing/subscription-status-badge.tsx` — Badge stato abbonamento

### Schema Zod

- `schemas/organization-subscription-schemas.ts` — `createCheckoutSchema`, `createPortalSessionSchema`, `listInvoicesSchema`, `listSubscriptionsSchema`, `planChangeSchema`, `updateSeatsSchema`
- `schemas/organization-credit-schemas.ts` — `getOrganizationCreditTransactionsSchema`, `purchaseOrganizationCreditSchema`

### Dipendenze

- Richiede: Organizations
- Richiesto da: AI Chatbot (per sistema crediti)

### Personalizzazione

- `config/billing.config.ts` — Piani (free/pro/lifetime), prezzi, features, limiti, pacchetti crediti, costi per modello AI, modelli chat disponibili
- Webhook Stripe in `app/api/webhooks/stripe/` per sync automatico
- Piani Enterprise commentati, pronti da attivare
- Costi crediti per 50+ modelli AI (OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Meta, Cohere, ecc.)

---

## Leads

**feature flag: `leads`** -- **Modulo reference per pattern CRUD**

Gestione lead per organizzazione: CRUD completo, ricerca, filtri (stato, fonte, data), ordinamento, paginazione, operazioni bulk (elimina, cambia stato), esportazione CSV/Excel. Questo modulo serve come esempio di riferimento per implementare nuove entita CRUD nel kit.

### Guard a 3 livelli

Ogni feature disabilitata e protetta su UI, API e middleware:

```typescript
// UI: nascondere componenti
import { FeatureGate } from "@/components/feature-gate";
<FeatureGate feature="leads"><LeadsSection /></FeatureGate>

// API: bloccare procedure tRPC
import { featureGuard } from "@/trpc/init";
list: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .query(...)

// Middleware: proxy.ts redirige rotte disabilitate
// /dashboard/organization/leads -> /dashboard se leads=false
```

### Tabelle DB

- `lead` — `id`, `organization_id`, `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `status` (enum: new/contacted/qualified/proposal/won/lost), `source` (enum: website/referral/social/advertising/cold_call/event/other), `estimated_value`, `notes`, `assigned_to_id` (FK a auth.users), `created_at`, `updated_at`

### Router tRPC

- `organization.lead.list` — Lista lead con filtri, ricerca, ordinamento, paginazione
- `organization.lead.get` — Dettaglio singolo lead
- `organization.lead.create` — Crea nuovo lead
- `organization.lead.update` — Aggiorna lead
- `organization.lead.delete` — Elimina lead
- `organization.lead.bulkDelete` — Elimina multipli lead
- `organization.lead.bulkUpdateStatus` — Aggiorna stato di multipli lead
- `organization.lead.exportSelectedToCsv` — Esporta lead selezionati in CSV
- `organization.lead.exportSelectedToExcel` — Esporta lead selezionati in Excel

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/organization/leads` | Tabella lead con filtri e azioni |

### Componenti chiave

- `components/organization/leads-table.tsx` — Tabella lead con DataTable, filtri, ordinamento
- `components/organization/leads-modal.tsx` — Modale creazione/modifica lead
- `components/organization/leads-bulk-actions.tsx` — Azioni bulk (elimina, cambia stato, esporta)

### Schema Zod

- `schemas/organization-lead-schemas.ts` — `listLeadsSchema`, `createLeadSchema`, `updateLeadSchema`, `deleteLeadSchema`, `bulkDeleteLeadsSchema`, `bulkUpdateLeadsStatusSchema`, `exportLeadsSchema`

### Dipendenze

- Richiede: Organizations
- Richiesto da: nessuno

### Personalizzazione

- Enum `LeadStatus` e `LeadSource` in `lib/enums.ts` — estendibili per aggiungere nuovi stati/fonti
- Campi lead personalizzabili (aggiungere colonne alla tabella e aggiornare schema Zod + router)
- Esportazione CSV/Excel con mapping camelCase per header leggibili

---

## AI Chatbot

**feature flag: `aiChatbot`**

Chat AI integrata per organizzazione: conversazioni persistenti, multi-modello (OpenAI, Anthropic, Google, ecc.), pin chat, ricerca conversazioni. Utilizza il sistema crediti del modulo Billing per tracciare il consumo per modello.

### Tabelle DB

- `ai_chat` — `id`, `organization_id`, `user_id`, `title`, `messages` (JSON text), `pinned`, `model`, `created_at`, `updated_at`

### Router tRPC

- `organization.ai.listChats` — Lista chat dell'organizzazione con paginazione (usa RPC `list_ai_chats`)
- `organization.ai.getChat` — Dettaglio chat con messaggi
- `organization.ai.createChat` — Crea nuova chat
- `organization.ai.updateChat` — Aggiorna titolo o messaggi chat
- `organization.ai.deleteChat` — Elimina chat
- `organization.ai.togglePin` — Fissa/sgancia chat
- `organization.ai.searchChats` — Cerca chat per titolo o contenuto messaggi

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/organization/chatbot` | Interfaccia chatbot AI |

### Componenti chiave

- `components/ai/ai-chat.tsx` — Componente principale chat AI
- `components/ai/conversation.tsx` — Visualizzazione conversazione
- `components/ai/message.tsx` — Singolo messaggio (user/assistant)
- `components/ai/prompt-input.tsx` — Input prompt con invio
- `components/ai/suggestion.tsx` — Suggerimenti prompt
- `components/ai/rename-chat-modal.tsx` — Modale rinomina chat
- `components/ai/loader.tsx` — Loader animato durante generazione risposta

### Schema Zod

- Schema inline nel router (`chatMessageSchema` con role, content, isError)

### Dipendenze

- Richiede: Organizations, Billing (per consumo crediti)
- Richiesto da: nessuno

### Personalizzazione

- `config/billing.config.ts` — modelli chat disponibili (`chatModels`), costi crediti per modello (`creditCosts`), modello default (`DEFAULT_CHAT_MODEL`)
- Max 1000 messaggi per chat, max 100.000 caratteri per messaggio
- Aggiungere nuovi modelli: inserire in `chatModels` + `creditCosts` in `config/billing.config.ts`

---

## Onboarding

**feature flag: `onboarding`**

Wizard di configurazione account post-registrazione. Guida l'utente attraverso i passaggi iniziali (profilo, ecc.) prima di accedere alla dashboard. Il middleware redirige automaticamente a `/dashboard/onboarding` se `onboardingComplete` e `false`.

### Tabelle DB

- Usa `user_profile.onboarding_complete` (booleano) e `auth.users.raw_user_meta_data.onboardingComplete`

### Router tRPC

- Nessun router dedicato; usa `user.getSession` per verificare stato e le API Supabase Auth per aggiornare `user_metadata.onboardingComplete`

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/onboarding` | Wizard onboarding (layout dedicato senza sidebar) |

### Componenti chiave

- `components/onboarding/onboarding-card.tsx` — Card container del wizard onboarding
- `components/onboarding/onboarding-profile-step.tsx` — Step configurazione profilo (nome, avatar)

### Schema Zod

- Validazione inline nei componenti onboarding

### Dipendenze

- Richiede: Auth
- Richiesto da: nessuno

### Personalizzazione

- Aggiungere nuovi step nel componente `onboarding-card.tsx`
- Il middleware `proxy.ts` gestisce il redirect automatico
- Se `onboarding=false`, gli utenti creati hanno `onboardingComplete=true` di default

---

## Admin Panel

**sempre attivo**

Pannello di amministrazione piattaforma accessibile solo a utenti con `user_profile.role = 'admin'`. Gestione utenti (lista, ban/unban, creazione, esportazione), gestione organizzazioni (lista, creazione, eliminazione, aggiunta membri, sync Stripe, gestione crediti, cancellazione abbonamenti), configurazione app.

### Tabelle DB

- Usa tutte le tabelle del sistema tramite `adminClient` (bypassa RLS)
- Lettura/scrittura su `user_profile`, `organization`, `member`, `subscription`, `credit_balance`, `invitation`

### Router tRPC

**Utenti (`admin.user.*`)**:
- `admin.user.list` — Lista utenti con filtri (ruolo, email verificata, ban, data), ordinamento, paginazione
- `admin.user.banUser` — Banna utente con motivo e scadenza opzionale
- `admin.user.unbanUser` — Rimuovi ban utente
- `admin.user.createUser` — Crea utente (bypassa restrizioni signup); auto-crea org personale se `personalAccountOnly=true`
- `admin.user.exportSelectedToCsv` — Esporta utenti selezionati in CSV
- `admin.user.exportSelectedToExcel` — Esporta utenti selezionati in Excel

**Organizzazioni (`admin.organization.*`)**:
- `admin.organization.list` — Lista organizzazioni con filtri (data, stato abbonamento, range crediti, conteggio membri), ordinamento, paginazione
- `admin.organization.delete` — Elimina organizzazione (cascade su tabelle figlie)
- `admin.organization.createOrganization` — Crea organizzazione con owner specificato
- `admin.organization.addMember` — Aggiungi membro a organizzazione
- `admin.organization.exportSelectedToCsv` — Esporta organizzazioni in CSV
- `admin.organization.exportSelectedToExcel` — Esporta organizzazioni in Excel
- `admin.organization.syncFromStripe` — Sync abbonamenti/ordini da Stripe (protetto da `featureGuard("billing")`)
- `admin.organization.adjustCredits` — Aggiungi/rimuovi crediti manualmente (protetto da `featureGuard("billing")`)
- `admin.organization.cancelSubscription` — Cancella abbonamento (immediato o a fine periodo, protetto da `featureGuard("billing")`)

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/dashboard/admin/users` | Gestione utenti piattaforma |
| `/dashboard/admin/organizations` | Gestione organizzazioni |
| `/dashboard/admin/app-config` | Configurazione app (feature flags, impostazioni) |

### Componenti chiave

- `components/admin/admin-menu-items.tsx` — Voci menu admin nella sidebar
- `components/admin/users/users-table.tsx` — Tabella utenti con filtri e azioni
- `components/admin/users/ban-user-modal.tsx` — Modale ban utente
- `components/admin/users/create-user-modal.tsx` — Modale creazione utente
- `components/admin/users/user-bulk-actions.tsx` — Azioni bulk utenti (esporta)
- `components/admin/organizations/organizations-table.tsx` — Tabella organizzazioni con filtri
- `components/admin/organizations/create-organization-modal.tsx` — Modale creazione organizzazione
- `components/admin/organizations/add-member-modal.tsx` — Modale aggiunta membro
- `components/admin/organizations/adjust-credits-modal.tsx` — Modale gestione crediti
- `components/admin/organizations/organization-bulk-actions.tsx` — Azioni bulk org (esporta, sync, cancella sub)
- `components/admin/app-config/app-config-table.tsx` — Tabella configurazione app

### Schema Zod

- `schemas/admin-user-schemas.ts` — `listUsersAdminSchema`, `banUserAdminSchema`, `unbanUserAdminSchema`, `exportUsersAdminSchema`
- `schemas/admin-create-user-schemas.ts` — `createUserAdminSchema`
- `schemas/admin-organization-schemas.ts` — `listOrganizationsAdminSchema`, `deleteOrganizationAdminSchema`, `exportOrganizationsAdminSchema`, `adjustCreditsAdminSchema`, `cancelSubscriptionAdminSchema`
- `schemas/admin-create-organization-schemas.ts` — `createOrganizationAdminSchema`, `addMemberAdminSchema`

### Dipendenze

- Richiede: Auth
- Richiesto da: nessuno

### Personalizzazione

- Accesso controllato da `user_profile.role = 'admin'` e `protectedAdminProcedure`
- Il primo admin va creato manualmente via SQL Editor (il trigger `protect_user_profile_fields` impedisce auto-promozione)
- Esportazione CSV/Excel personalizzabile (colonne, mapping)
- Pagina app-config mostra lo stato corrente dei feature flags

---

## Contact Form

**sempre attivo**

Modulo di contatto pubblico nella pagina marketing. Invia email al destinatario configurato tramite Resend. Protetto opzionalmente da Cloudflare Turnstile (CAPTCHA).

### Tabelle DB

- Nessuna tabella dedicata (i messaggi vengono inviati via email)

### Router tRPC

- `contact.submit` — Invia modulo di contatto (publicProcedure); verifica Turnstile se configurato, invia email tramite `sendContactFormEmail`

### Pagine

| Percorso | Scopo |
|----------|-------|
| `/(marketing)/contact` | Pagina di contatto pubblica |

### Componenti chiave

- `components/marketing/sections/contact-section.tsx` — Sezione form di contatto con validazione

### Schema Zod

- Schema inline nel router: `firstName`, `lastName`, `email`, `message` (min 10 char), `captchaToken` (opzionale)

### Dipendenze

- Richiede: nessuno
- Richiesto da: nessuno

### Personalizzazione

- `config/app.config.ts` — `contact.email` (destinatario email)
- `TURNSTILE_SECRET_KEY` env var — abilita verifica CAPTCHA Cloudflare
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — chiave pubblica per widget Turnstile
- Template email personalizzabile in `lib/email/templates/`

---

## File di configurazione

| File | Scopo |
|------|-------|
| `config/app.config.ts` | Nome app, URL base, email contatto, paginazione |
| `config/features.config.ts` | Feature flags con vincoli logici |
| `config/billing.config.ts` | Piani, prezzi, pacchetti crediti, costi modelli AI |
| `config/auth.config.ts` | Redirect auth, durata sessione, CORS, origini trusted |
| `lib/env.ts` | Variabili d'ambiente con validazione Zod (client + server) |
| `supabase/config.toml` | Configurazione Supabase locale (auth, storage, API) |

---

## Documenti correlati

- [UI-PATTERNS.md](./UI-PATTERNS.md) — Pattern UI e componenti riutilizzabili
- [EXTENDING-ORGANIZATION.md](./EXTENDING-ORGANIZATION.md) — Come estendere il modulo organizzazione
- [FEATURE-FLAGS.md](./FEATURE-FLAGS.md) — Documentazione completa feature flags
- [ROLES.md](../ROLES.md) — Sistema ruoli piattaforma e organizzazione

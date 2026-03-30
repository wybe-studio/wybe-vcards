# Spec: Documentazione Starter Kit e Skill Init Project

Data: 2026-03-30
Approvato durante brainstorming session.

## Panoramica

Il progetto Wybe Kit e uno starter kit SaaS. Per facilitare la derivazione di nuovi progetti, servono:

1. **Documentazione completa** dei moduli, pattern UI, e guida per aggiungere entita
2. **Skill `/init-project`** che orchestra il processo di inizializzazione di un nuovo progetto

### Problema

- Chi clona il kit non ha una mappa chiara dei moduli attivabili/disattivabili
- Non esiste una guida end-to-end per aggiungere una nuova entita CRUD
- I pattern UI (tabella, settings, griglia, wizard) non sono documentati
- Il processo di init e manuale e dipende dalla conoscenza pregressa del kit

### Soluzione: Approccio 3 — Docs completi + Skill orchestratore

- Documentazione come single source of truth (3 file)
- Skill `/init-project` che legge i docs e orchestra il flusso
- Nessuna duplicazione di conoscenza tra docs e skill

### Flusso d'uso

```
Utente clona il repo
  -> Apre Claude Code nel progetto
  -> Lancia /init-project
  -> La skill guida raccolta requisiti (discovery -> strutturazione -> validazione)
  -> Genera spec del nuovo progetto
  -> Passa a writing-plans -> executing-plans
```

## Deliverable

### 1. `docs/MODULES.md` — Mappa moduli del kit

Documento che cataloga ogni modulo del kit con struttura uniforme.

#### Struttura per ogni modulo

```markdown
## [Nome Modulo] (feature flag: [nome] | sempre attivo)

### Descrizione
[Cosa fa il modulo in 1-2 frasi]

### Tabelle DB
- `tabella` — [scopo, colonne chiave]

### Router tRPC
- `namespace.procedura` — [scopo]

### Pagine
- `/path` — [scopo]

### Componenti chiave
- `components/path/file.tsx` — [scopo]

### Dipendenze
- Richiede: [altri moduli]
- Richiesto da: [moduli che dipendono da questo]

### Personalizzazione
- [Cosa si puo configurare senza toccare codice]
```

#### Moduli da documentare

| Modulo | Feature Flag | Default | Dipendenze |
|--------|-------------|---------|------------|
| Auth | sempre attivo | — | Nessuna (modulo base) |
| Organizations | `multiOrg` | true | Auth |
| Billing | `billing` | true | Organizations |
| Leads | `leads` | true | Organizations |
| AI Chatbot | `aiChatbot` | true | Organizations, Billing (crediti) |
| Onboarding | `onboarding` | true | Auth, Organizations |
| Admin Panel | sempre attivo | — | Auth |
| Contact Form | sempre attivo | — | Nessuna |
| Public Registration | `publicRegistration` | true | Auth |
| Google Auth | `googleAuth` | false | Auth |
| Personal Account Only | `personalAccountOnly` | false | Auth, Organizations (forza multiOrg=false) |

#### Contenuto specifico per modulo

Ogni modulo elenca:
- Tabelle DB con colonne chiave e relazioni
- Tutte le procedure tRPC (raggruppate per CRUD)
- Pagine e loro scopo
- Componenti principali con path
- Dipendenze bidirezionali (richiede / richiesto da)
- Schema Zod associati
- Email templates (se presenti)
- Note speciali (es. Lead e modulo reference per pattern CRUD)

---

### 2. `docs/UI-PATTERNS.md` — Pattern UI riutilizzabili

Documenta i 4 pattern UI core del kit. Per ogni pattern:

#### Pattern A: Tabella CRUD con Sheet laterale

- **Quando usarlo**: Gestione entita con lista, filtri, ordinamento, azioni bulk, form in sheet laterale
- **Struttura**: Header + filtri + tabella ordinabile/paginata + sheet con form
- **Componenti**: DataTable, Sheet/SheetContent, Input, Select, useZodForm
- **Snippet**: Struttura tipo della pagina (codice reale, non pseudocodice)
- **File di reference** (modulo Lead):
  - `app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx`
  - `components/organization/leads-table.tsx`
  - `components/organization/leads-modal.tsx`
  - `components/organization/leads-bulk-actions.tsx`
  - `schemas/organization-lead-schemas.ts`
  - `trpc/routers/organization/organization-lead-router.ts`

#### Pattern B: Settings a Tab

- **Quando usarlo**: Pagine impostazioni con sezioni raggruppate
- **Struttura**: Tab navigation orizzontale + Card per sezione + form inline
- **Componenti**: Tabs/TabsList/TabsTrigger/TabsContent, Card, useZodForm
- **Snippet**: Struttura tipo con tab e card
- **File di reference**:
  - `components/organization/organization-settings-tabs.tsx`
  - `components/organization/organization-change-name-card.tsx`
  - `components/organization/organization-logo-card.tsx`
  - `components/organization/delete-organization-card.tsx`
  - `components/organization/organization-members-card.tsx`

#### Pattern C: Griglia Card

- **Quando usarlo**: Lista entita come card in griglia responsive, selezione/overview
- **Struttura**: Header + griglia responsive (1-2-3 colonne) + empty state
- **Componenti**: Card/CardHeader/CardContent, grid Tailwind
- **Snippet**: Struttura tipo con griglia e empty state
- **File di reference**:
  - `components/organization/organizations-grid.tsx`

#### Pattern E: Wizard Multi-step

- **Quando usarlo**: Flussi guidati con step sequenziali e validazione per step
- **Struttura**: Progress indicator + contenuto per step + navigazione + validazione
- **Componenti**: useState per step, Card, Button, useZodForm con schema per step
- **Snippet**: Struttura tipo con step machine
- **File di reference**:
  - `app/(saas)/dashboard/onboarding/page.tsx`
  - `components/onboarding/`

#### Elementi comuni a ogni pattern

- Sezione "Quando usarlo" — aiuta la skill a proporre il pattern giusto
- Snippet di codice concreti che usano i componenti reali del kit
- Link ai file di reference che Claude puo leggere per l'implementazione completa
- Componenti Shadcn UI e hook del progetto (non generici)

---

### 3. `docs/ADDING-ENTITY.md` — Guida aggiunta entita CRUD

Guida step-by-step completa, stile coerente con `docs/EXTENDING-ORGANIZATION.md`.

#### Step 1: Migration database
- Template SQL per tabella con tutti i pattern standard (uuid PK, organization_id FK, timestamps, indici)
- Template RLS policies con le funzioni helper del kit (`is_organization_member`, `has_org_role`, `is_platform_admin`)
- Varianti RLS per diversi livelli di accesso (tutti leggono, solo admin modificano, solo propri record)
- Comandi per creare/applicare migration e rigenerare tipi
- **Riferimento**: migration iniziale, sezione lead

#### Step 2: Schema Zod
- Template per schema create (campi obbligatori)
- Template per schema update (partial + id)
- Template per schema list (search, filtri, sort, paginazione)
- Template per schema bulk actions
- **Riferimento**: `schemas/organization-lead-schemas.ts`

#### Step 3: Router tRPC
- Template per procedure CRUD complete (list con filtri/sort/paginazione, get, create, update, delete, bulkDelete)
- Come registrare il router nell'organization router
- Feature guard se il modulo ha un flag
- **Riferimento**: `trpc/routers/organization/organization-lead-router.ts`

#### Step 4: Pagina UI
- Rimando a `docs/UI-PATTERNS.md` per scegliere il pattern
- Tabella file necessari per pattern A (pagina, tabella, modal, bulk actions)
- **Riferimento**: file del modulo Lead

#### Step 5: Navigazione
- Come aggiungere voce al sidebar (`organization-menu-items.tsx`)
- FeatureGate per voci condizionali
- Redirect in `proxy.ts` per feature flag disattivati

#### Step 6: Feature flag (opzionale)
- Checklist 5 punti: env.ts, features.config.ts, featureGuard, FeatureGate, proxy.ts
- **Riferimento**: `docs/FEATURE-FLAGS.md`

#### Checklist finale
Lista di verifica completa per ogni step.

---

### 4. `.claude/skills/init-project/` — Skill di inizializzazione

#### Struttura directory

```
.claude/skills/init-project/
  SKILL.md          # Skill principale — flusso e orchestrazione
  questions.md      # Reference domande organizzate per fase
  spec-template.md  # Template dello spec generato
```

#### `SKILL.md` — Flusso principale

##### Prerequisiti
La skill legge prima di iniziare:
- `docs/MODULES.md`
- `docs/UI-PATTERNS.md`
- `docs/ADDING-ENTITY.md`
- `CLAUDE.md`

##### Fase 1 — Discovery (domande aperte)

Obiettivo: capire il progetto, lo scope, il contesto.

Domande una alla volta, con riformulazione per conferma:

1. "Descrivi il progetto in poche frasi — cosa fa e per chi e pensato?"
2. "Quali sono le funzionalita principali che vuoi implementare?"
3. "Come immagini il flusso tipico di un utente? (registrazione -> cosa fa -> obiettivo)"
4. "Ci sono vincoli particolari? (settore, compliance, integrazioni esterne, deadline)"
5. "C'e un modello di business? (gratis, freemium, abbonamento, per-seat, crediti a consumo)"

Dopo ogni risposta:
- Riformulare brevemente per conferma
- Annotare entita e flussi emersi
- Approfondire con domande follow-up se qualcosa non e chiaro

Al termine: riepilogo con entita identificate e flussi chiave. Conferma utente.

##### Fase 2 — Strutturazione (domande mirate)

**2a. Configurazione moduli del kit**
- Presentare tabella moduli da `MODULES.md`
- Per ogni modulo, dare un consiglio basato sulla discovery (es. "Billing: consiglio attivo perche hai menzionato abbonamenti")
- L'utente conferma/modifica

**2b. Entita del nuovo progetto**
Per ogni entita emersa, chiedere:
1. Campi principali (nome, tipo, obbligatorieta)
2. Permessi per ruolo (chi legge, chi crea, chi modifica, chi elimina)
3. Relazioni con altre entita
4. Stati/workflow (se presenti)

**2c. Pattern UI per ogni entita**
- Leggere `UI-PATTERNS.md`
- Proporre il pattern piu adatto con motivazione
- L'utente conferma o sceglie diversamente

**2d. Personalizzazione progetto**
- Nome app (aggiorna `appConfig.name`)
- Dominio/base URL
- Personalizzazione piani billing (o default Free/Pro/Lifetime)

##### Fase 3 — Validazione e generazione spec

1. Riepilogo completo strutturato
2. Conferma utente
3. Generazione spec da `spec-template.md`
4. Salvataggio in `docs/superpowers/specs/YYYY-MM-DD-init-[nome-progetto]-spec.md`
5. Review utente dello spec
6. Invocazione skill `writing-plans`

#### `questions.md` — Reference domande

Organizzato per fase con:
- Domande obbligatorie vs opzionali
- Quando fare follow-up
- Pattern di risposta tipici (es. "non so ancora" -> proporre default ragionevole)
- Mappatura risposte -> decisioni tecniche:
  - "ogni utente vede solo i suoi" -> RLS con `assigned_to_id = auth.uid()` o `user_id = auth.uid()`
  - "solo admin possono eliminare" -> RLS con `has_org_role(org_id, 'admin')`
  - "ha degli stati" -> enum PostgreSQL + colonna status
  - "appartiene a un membro" -> FK a `auth.users(id)` con ON DELETE SET NULL

#### `spec-template.md` — Template spec

Struttura del documento generato:

```
# Spec: [Nome Progetto]
Data, generato da /init-project

## Panoramica
Descrizione, utenti target, value proposition

## Configurazione Kit
### Feature Flag (tabella flag/valore/motivo)
### App Config (nome, URL, billing)

## Entita
### [Nome Entita]
#### Campi (tabella campo/tipo/obbligatorio/note)
#### Permessi (tabella azione/owner/admin/member/note)
#### Relazioni
#### Stati/Workflow
#### Pattern UI (quale pattern + note adattamento)

## Flussi Utente
Flussi principali numerati

## Note Implementazione
Complessita, integrazioni, edge case
```

---

## Decisioni di design

### Moduli demo (Lead, AI Chatbot)
**Decisione**: Disattivare via feature flag, non rimuovere il codice.
**Motivo**: Il codice resta come reference vivo. Meno rischio di rompere qualcosa. Lead e esplicitamente il pattern CRUD di riferimento.

### Posizione skill
**Decisione**: Dentro il repo (`.claude/skills/init-project/`).
**Motivo**: Viene clonata con il progetto, nessun setup extra. Riutilizzabile in futuro per aggiungere moduli.

### Livello di dettaglio domande
**Decisione**: Medio — entita con campi, relazioni, permessi, pattern UI. Non mockup o PRD completo.
**Motivo**: Abbastanza per generare un piano concreto. I dettagli fini emergono durante l'implementazione.

### Documentazione pattern UI
**Decisione**: Descrittiva con codice reference e link ai file del modulo Lead.
**Motivo**: Coerenza con stile `EXTENDING-ORGANIZATION.md`. Claude puo leggere i file linkati per l'implementazione completa.

### Approccio generale
**Decisione**: Docs come source of truth, skill come orchestratore che li legge.
**Motivo**: No duplicazione. Aggiornando i docs la skill li usa automaticamente. I docs servono anche standalone.

---

## Dipendenze e vincoli

- I docs devono essere scritti PRIMA della skill (la skill li referenzia)
- La skill deve essere testata con un progetto di esempio (es. "app vcard")
- I link ai file di reference devono essere verificati (i path esistono nel repo)
- La skill produce uno spec che viene poi consumato da `writing-plans` (skill esistente)

## Ordine di implementazione

1. `docs/MODULES.md` — mappa moduli (base di conoscenza)
2. `docs/UI-PATTERNS.md` — pattern UI con reference al codice
3. `docs/ADDING-ENTITY.md` — guida step-by-step nuova entita
4. `.claude/skills/init-project/SKILL.md` — skill principale
5. `.claude/skills/init-project/questions.md` — reference domande
6. `.claude/skills/init-project/spec-template.md` — template spec
7. Test end-to-end con progetto di esempio

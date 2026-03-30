# Template Spec Progetto

Usare questo template per generare lo spec del nuovo progetto.
Sostituire tutti i placeholder `[...]` con i dati raccolti durante le fasi di discovery e strutturazione.

---

# Spec: [Nome Progetto]

Data: [YYYY-MM-DD]
Generato da: /init-project

## Panoramica

[Descrizione 2-3 frasi: cosa fa il progetto, per chi e pensato, qual e la value proposition principale]

### Utenti target

- [Tipo utente 1] — [cosa fa, quali problemi risolve]
- [Tipo utente 2] — [cosa fa, quali problemi risolve]

### Vincoli

- [Vincolo 1: settore, compliance, deadline, integrazioni]
- [Oppure: "Nessun vincolo particolare identificato"]

## Configurazione Kit

### Feature Flag

| Flag | Valore | Motivo |
|------|--------|--------|
| `multiOrg` | [true/false] | [motivo della scelta] |
| `billing` | [true/false] | [motivo della scelta] |
| `leads` | false | Modulo demo disattivato |
| `aiChatbot` | [true/false] | [motivo della scelta] |
| `onboarding` | [true/false] | [motivo della scelta] |
| `publicRegistration` | [true/false] | [motivo della scelta] |
| `googleAuth` | [true/false] | [motivo della scelta] |
| `personalAccountOnly` | [true/false] | [motivo della scelta] |

### App Config

- **Nome**: [nome app]
- **Base URL**: [url produzione o localhost:3000 per dev]
- **Lingua**: italiano (hardcoded, no i18n)

### Billing Config (se billing=true)

| Piano | Prezzo | Intervallo | Caratteristiche |
|-------|--------|-----------|-----------------|
| [Free/Starter] | [0/prezzo] | [month/year] | [limiti e feature incluse] |
| [Pro/Business] | [prezzo] | [month/year] | [limiti e feature incluse] |

## Entita

### [Nome Entita 1]

#### Descrizione

[1-2 frasi che spiegano cos'e questa entita e il suo ruolo nel progetto]

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| id | uuid | PK | Auto-generated |
| organization_id | uuid FK | si | FK a organization(id) ON DELETE CASCADE |
| [campo_1] | [text/integer/boolean/timestamptz/uuid/jsonb] | [si/no] | [note: default, vincoli, enum] |
| [campo_2] | [tipo] | [si/no] | [note] |
| [campo_n] | [tipo] | [si/no] | [note] |
| created_at | timestamptz | si | Auto (trigger) |
| updated_at | timestamptz | si | Auto (trigger) |

#### Permessi

| Azione | owner | admin | member | Note |
|--------|:-----:|:-----:|:------:|------|
| Lettura | ✅ | ✅ | [✅/Solo propri] | [note su filtri] |
| Creazione | ✅ | ✅ | [✅/❌] | [note] |
| Modifica | ✅ | ✅ | [Solo propri/❌] | [note] |
| Eliminazione | ✅ | [✅/❌] | ❌ | [note] |

#### Pattern RLS

```sql
-- [Descrizione pattern scelto]
-- SELECT: [policy description]
-- INSERT: [policy description]
-- UPDATE: [policy description]
-- DELETE: [policy description]
```

#### Relazioni

- Appartiene a: `organization` (via `organization_id`)
- [Creato da: `auth.users` (via `created_by_id`)]
- [Assegnato a: `auth.users` (via `assigned_to_id`)]
- [Ha molti: `[sotto_entita]`]
- [Collegato a: `[altra_entita]` (via `[fk_column]`)]

#### Stati/Workflow

[Lista stati con transizioni, oppure "Nessun workflow — l'entita e semplicemente attiva o eliminata"]

```
[stato_1] -> [stato_2] -> [stato_3]
                       \-> [stato_4]
```

#### Pattern UI

- **Pattern**: [A — Tabella CRUD con Sheet / B — Settings a Tab / C — Griglia Card / E — Wizard Multi-step]
- **Motivazione**: [perche questo pattern e il piu adatto]
- **Adattamenti**: [eventuali personalizzazioni rispetto al pattern standard]

---

### [Nome Entita 2]

[Ripetere la struttura sopra per ogni entita]

---

## Flussi Utente

### Flusso 1: [Nome del flusso]

**Attore**: [ruolo utente]
**Trigger**: [cosa avvia il flusso]

1. [Step 1 — azione utente]
2. [Step 2 — risposta sistema]
3. [Step 3 — azione utente]
4. [Step N — risultato finale]

### Flusso 2: [Nome del flusso]

[Ripetere la struttura sopra per ogni flusso principale]

---

## Moduli di riferimento

Pattern esistenti nel kit da usare come reference durante l'implementazione:

- **Lead module** (`trpc/routers/leads.ts`, `app/(saas)/dashboard/organization/leads/`) — Pattern CRUD completo: tabella, sheet, filtri, import/export
- **Organization settings** (`app/(saas)/dashboard/organization/settings/`) — Pattern settings a tab con form multipli
- **Organizations grid** (`app/(saas)/dashboard/organizations/`) — Pattern griglia card con selezione
- **Onboarding** (`app/(saas)/dashboard/onboarding/`) — Pattern wizard multi-step

## Note implementazione

### Complessita stimata

- [Entita semplici: 1-2 giorni ciascuna]
- [Entita complesse: 3-5 giorni ciascuna]
- [Integrazioni esterne: tempo stimato]

### Ordine consigliato di implementazione

1. [Primo: entita/feature fondamentale da cui dipendono le altre]
2. [Secondo: entita/feature che estende la prima]
3. [Terzo: feature secondarie]
4. [Ultimo: ottimizzazioni, integrazioni non-core]

### Edge case e considerazioni

- [Edge case 1: cosa potrebbe andare storto e come gestirlo]
- [Edge case 2: limiti noti o decisioni da prendere in fase di implementazione]
- [Integrazioni esterne: requisiti, API key necessarie, rate limits]

### Moduli da rimuovere

- Lead module (modulo demo) — rimuovere routes, tRPC router, componenti, migrazione
- [Altri moduli non necessari]

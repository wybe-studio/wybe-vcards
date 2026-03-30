# Spec: Wybe vCards

Data: 2026-03-30
Generato da: /init-project

## Panoramica

Piattaforma multi-tenant per la gestione di vCard digitali aziendali collegate a card fisiche NFC/QR. Pensata per PMI (10-200 dipendenti) che vogliono gestire centralmente i biglietti da visita digitali del team, con branding coerente e aggiornamento in tempo reale. Modello B2B puro: nessun billing in-app, onboarding gestito dal Platform Admin a valle di contratti commerciali.

### Utenti target

- **Platform Admin** (`user_profile.role = 'admin'`) — Gestisce la piattaforma: crea organizzazioni, genera card fisiche, configura limiti tecnici (max vCard, max card fisiche)
- **Organization Owner** — Referente aziendale: configura branding, profilo aziendale, crea vCard, assegna card fisiche, gestisce membri
- **Organization Admin** — Stessi permessi dell'Owner tranne impostazioni critiche org
- **Member** — Dipendente con vCard assegnata: modifica solo la propria vCard
- **Visitatore** (nessun account) — Riceve la vCard via NFC/QR/link, visualizza la pagina pubblica, salva il contatto

### Vincoli

- Modello B2B puro — nessun signup pubblico, nessun billing self-service
- Onboarding organizzazioni gestito manualmente dal Platform Admin
- GDPR compliance (diritto all'oblio, disattivazione rapida vCard/card fisiche)
- Limiti tecnici per organizzazione (max vCard, max card fisiche) configurabili dal Platform Admin

## Configurazione Kit

### Feature Flag

| Flag | Valore | Motivo |
|------|--------|--------|
| `multiOrg` | `false` | L'admin crea l'org dal pannello, l'Owner non puo crearne altre |
| `billing` | `false` | Contratti B2B esterni, nessun billing in-app |
| `leads` | `false` | Modulo demo, da rimuovere |
| `aiChatbot` | `false` | Nessun requisito AI |
| `onboarding` | `true` | Wizard primo accesso Owner (profilo aziendale, branding) |
| `publicRegistration` | `false` | Accesso solo su invito |
| `googleAuth` | `false` | Solo email/password |
| `personalAccountOnly` | `false` | Servono le organizzazioni come tenant |

### App Config

- **Nome**: Wybe vCards
- **Base URL**: localhost:3000 (dev)
- **Lingua**: italiano (hardcoded, no i18n)

### Billing Config

Non applicabile — billing disabilitato. I limiti tecnici (max vCard, max card fisiche) sono gestiti come campi sull'organizzazione, configurabili dal Platform Admin.

## Entita

### vCard

#### Descrizione

Biglietto da visita digitale di un dipendente. Contiene dati personali e professionali, e accessibile tramite pagina pubblica con URL `/{slug-org}/{slug-vcard}`. Puo essere collegata a un utente autenticato (member) e a una card fisica NFC/QR.

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| id | uuid | PK | Auto-generated |
| organization_id | uuid FK | si | FK a organization(id) ON DELETE CASCADE |
| first_name | text | si | Nome |
| last_name | text | si | Cognome |
| slug | text | si | UNIQUE per org, formato leggibile (mario.rossi) o UUID |
| job_title | text | no | Ruolo/posizione |
| email | text | no | Email lavoro personale |
| phone | text | no | Telefono principale |
| phone_secondary | text | no | Telefono secondario |
| linkedin_url | text | no | Profilo LinkedIn |
| profile_image | text | no | Path immagine su Supabase Storage |
| status | enum (vcard_status) | si | `active`, `suspended`, `archived` — default `active` |
| user_id | uuid FK | no | FK nullable a auth.users(id) ON DELETE SET NULL — member collegato |
| metadata | jsonb | no | Default `{}`, max 20 chiavi — per campi futuri |
| created_at | timestamptz | si | Auto (trigger) |
| updated_at | timestamptz | si | Auto (trigger) |

#### Permessi

| Azione | owner | admin | member | Note |
|--------|:-----:|:-----:|:------:|------|
| Lettura | tutte | tutte | solo propria | Filtro su `user_id = auth.uid()` per member |
| Creazione | si | si | no | |
| Modifica | tutte | tutte | solo propria | Member modifica solo la vCard con il proprio `user_id` |
| Eliminazione | si | si | no | |

#### Pattern RLS

```sql
-- admin+ vede tutte le vCard dell'org, member solo la propria
-- SELECT: has_org_role(organization_id, 'admin') OR user_id = auth.uid()
-- INSERT: has_org_role(organization_id, 'admin')
-- UPDATE: has_org_role(organization_id, 'admin') OR user_id = auth.uid()
-- DELETE: has_org_role(organization_id, 'admin')
```

#### Relazioni

- Appartiene a: `organization` (via `organization_id`, CASCADE)
- Collegata a: `auth.users` (via `user_id`, SET NULL)
- Ha una: `physical_card` (la card fisica punta alla vCard, relazione 1:1)

#### Stati/Workflow

```
active <-> suspended -> archived
```

- `active`: pagina pubblica visibile e raggiungibile
- `suspended`: pagina mostra messaggio "vCard non attiva"
- `archived`: non piu raggiungibile, terminale

#### Pattern UI

- **Pattern**: A — Tabella CRUD con Sheet
- **Motivazione**: Molti record per org, servono ricerca per nome/email/ruolo, filtri per status, azioni rapide (copia link, apri pagina pubblica), paginazione
- **Adattamenti**: Colonna azioni con "Copia link", "Apri pubblica", "Modifica", "Elimina". Badge per status. Indicatore licenze utilizzate/totali nell'header.

---

### Card fisica (physical_card)

#### Descrizione

Card NFC/QR identificata da un codice univoco `XXXX-XXXX`. Quando scansionata, reindirizza alla pagina pubblica della vCard associata. Il codice usa un charset non ambiguo (esclusi O/0, I/1 e simili). La relazione con la vCard e 1:1 e riassegnabile.

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| id | uuid | PK | Auto-generated |
| organization_id | uuid FK | si | FK a organization(id) ON DELETE CASCADE |
| code | text | si | Formato `XXXX-XXXX`, UNIQUE globale, charset non ambiguo |
| vcard_id | uuid FK | no | FK nullable a vcard(id) ON DELETE SET NULL — riassegnabile |
| status | enum (physical_card_status) | si | `free`, `assigned`, `disabled` — default `free` |
| created_at | timestamptz | si | Auto (trigger) |
| updated_at | timestamptz | si | Auto (trigger) |

#### Permessi

| Azione | owner | admin | member | platform admin | Note |
|--------|:-----:|:-----:|:------:|:--------------:|------|
| Lettura | tutte | tutte | no | tutte | |
| Creazione (batch) | no | no | no | si | Genera N codici e assegna a org |
| Modifica (assegna/scollega) | si | si | no | si | Cambia vcard_id e status |
| Disattivazione | si | si | no | si | Setta status = disabled |

#### Pattern RLS

```sql
-- Solo admin+ dell'org possono vedere e gestire le card fisiche
-- SELECT: has_org_role(organization_id, 'admin')
-- INSERT: solo via adminClient (platform admin genera batch)
-- UPDATE: has_org_role(organization_id, 'admin')
-- DELETE: has_org_role(organization_id, 'admin')
```

#### Relazioni

- Appartiene a: `organization` (via `organization_id`, CASCADE)
- Collegata a: `vcard` (via `vcard_id`, SET NULL — riassegnabile)

#### Stati/Workflow

```
free <-> assigned <-> disabled
```

- `free`: card generata, non collegata a nessuna vCard
- `assigned`: collegata a una vCard, scansione reindirizza alla pagina pubblica
- `disabled`: disattivata (smarrimento, ecc.), scansione mostra pagina "card non attiva"

Transizioni bidirezionali: una card disabled puo essere riattivata (free), una card assigned puo essere scollegata (free) e riassegnata.

#### Pattern UI

- **Pattern**: A — Tabella CRUD con Sheet
- **Motivazione**: Lista con filtri per stato (free/assigned/disabled), ricerca per codice o nome dipendente associato, azioni rapide (assegna, scollega, disattiva, riattiva)
- **Adattamenti**: No bottone "Crea" lato org (la creazione batch e solo da pannello admin). Badge colorati per status. Nel pannello admin: bottone "Genera batch" con input quantita (1-500).

---

### Profilo aziendale (organization_profile)

#### Descrizione

Dati aziendali condivisi a livello di organizzazione, visualizzati nella scheda "Azienda" di ogni vCard pubblica. Relazione 1:1 con l'organizzazione. Creato automaticamente quando viene creata l'organizzazione.

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| organization_id | uuid | PK + FK | FK a organization(id) ON DELETE CASCADE |
| company_name | text | no | Ragione sociale |
| vat_number | text | no | Partita IVA |
| fiscal_code | text | no | Codice fiscale |
| ateco_code | text | no | Codice ATECO |
| sdi_code | text | no | Codice SDI |
| iban | text | no | IBAN |
| bank_name | text | no | Nome banca |
| pec | text | no | PEC |
| phone | text | no | Telefono aziendale |
| email | text | no | Email aziendale |
| website | text | no | Sito web |
| linkedin_url | text | no | LinkedIn aziendale |
| facebook_url | text | no | Facebook |
| instagram_url | text | no | Instagram |
| address | text | no | Indirizzo operativo |
| legal_address | text | no | Sede legale |
| admin_contact_name | text | no | Nome contatto amministrativo |
| admin_contact_email | text | no | Email contatto amministrativo |
| notes | text | no | Note interne |
| created_at | timestamptz | si | Auto (trigger) |
| updated_at | timestamptz | si | Auto (trigger) |

#### Permessi

| Azione | owner | admin | member | Note |
|--------|:-----:|:-----:|:------:|------|
| Lettura | si | si | si | Dati visibili sulla pagina pubblica |
| Modifica | si | si | no | |

#### Pattern RLS

```sql
-- Tutti i membri dell'org possono leggere, solo admin+ possono modificare
-- SELECT: is_organization_member(organization_id)
-- UPDATE: has_org_role(organization_id, 'admin')
-- INSERT/DELETE: non necessari (creato/eliminato con l'org via CASCADE)
```

#### Relazioni

- Relazione 1:1 con: `organization` (PK = FK, CASCADE)

#### Stati/Workflow

Nessun workflow — scheda dati, creata automaticamente con l'organizzazione.

#### Pattern UI

- **Pattern**: B — Settings a Tab
- **Motivazione**: Record singolo con molti campi raggruppabili per categoria
- **Adattamenti**: Tab "Profilo aziendale" nelle impostazioni organizzazione. Form diviso in sezioni: Identita legale, Contatti operativi, Dati fatturazione. Ogni sezione con i campi pertinenti.

---

### Stile/Branding (organization_style)

#### Descrizione

Personalizzazione grafica delle vCard pubbliche dell'organizzazione. Controlla i colori dell'effetto aurora, dell'intestazione, dei bottoni e delle tab. Include anche il formato slug predefinito per le nuove vCard. Relazione 1:1 con l'organizzazione.

#### Campi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|:------------:|------|
| organization_id | uuid | PK + FK | FK a organization(id) ON DELETE CASCADE |
| aurora_color_primary | text | no | Colore primario effetto aurora (hex) |
| aurora_color_secondary | text | no | Colore secondario effetto aurora (hex) |
| header_bg_color | text | no | Sfondo intestazione vCard (hex) |
| header_text_color | text | no | Testo intestazione vCard (hex) |
| button_bg_color | text | no | Sfondo bottone "Aggiungi contatto" (hex) |
| button_text_color | text | no | Testo bottone "Aggiungi contatto" (hex) |
| tab_bg_color | text | no | Sfondo barra schede Contatti/Azienda (hex) |
| slug_format | text | si | `readable` o `uuid` — default per nuove vCard, default `readable` |
| created_at | timestamptz | si | Auto (trigger) |
| updated_at | timestamptz | si | Auto (trigger) |

#### Permessi

| Azione | owner | admin | member | Note |
|--------|:-----:|:-----:|:------:|------|
| Lettura | si | si | si | Serve per rendering pagina pubblica |
| Modifica | si | si | no | |

#### Pattern RLS

```sql
-- Tutti i membri dell'org possono leggere, solo admin+ possono modificare
-- SELECT: is_organization_member(organization_id)
-- UPDATE: has_org_role(organization_id, 'admin')
-- INSERT/DELETE: non necessari (creato/eliminato con l'org via CASCADE)
```

#### Relazioni

- Relazione 1:1 con: `organization` (PK = FK, CASCADE)

#### Stati/Workflow

Nessun workflow — scheda configurazione, creata automaticamente con l'organizzazione.

#### Pattern UI

- **Pattern**: B — Settings a Tab
- **Motivazione**: Record singolo con form di personalizzazione colori
- **Adattamenti**: Tab "Stile" nelle impostazioni organizzazione. Color picker per ogni colore. Preview live dell'effetto sui colori scelti (nice-to-have). Select per slug_format (leggibile/UUID).

---

## Pagina Pubblica vCard

### Descrizione

Pagina accessibile senza login a `/{slug-org}/{slug-vcard}`. Raggiungibile anche via redirect da `/code/XXXX-XXXX`. Non richiede autenticazione.

### Struttura

- **Intestazione**: foto profilo, nome, ruolo, logo aziendale
- **Sfondo**: effetto aurora animato con colori personalizzabili dall'org
- **Scheda "Contatti"**: cellulare, telefono ufficio, email, LinkedIn — ogni voce cliccabile e copiabile
- **Scheda "Azienda"**: dati da organization_profile — ogni voce cliccabile e copiabile
- **Azioni**: bottone "Aggiungi contatto" (download .vcf), bottone QR code

### URL

- Pagina vCard: `/{slug-org}/{slug-vcard}`
- Redirect card fisica: `/code/XXXX-XXXX` → resolve codice → redirect a pagina vCard

### Reference

Per la pagina pubblica replicare componenti e layout da `D:\Github\vcards-superpowers\apps\web\app\[accountSlug]` (come indicato nel PRD).

---

## Limiti Tecnici per Organizzazione

I limiti sono gestiti come campi sulla tabella `organization` (o nel campo `metadata` JSONB), configurabili dal Platform Admin:

- `max_vcards` — numero massimo di vCard attivabili
- `max_physical_cards` — numero massimo di card fisiche

La piattaforma deve controllare questi limiti alla creazione di nuove vCard e alla generazione batch di card fisiche.

---

## Tab Impostazioni Organizzazione

| Tab | Contenuto | Entita |
|-----|-----------|--------|
| Generale | Nome, logo, slug org | organization (esistente) |
| Profilo aziendale | Dati aziendali (identita, contatti, fatturazione) | organization_profile |
| Stile | Colori, slug format | organization_style |
| Membri | Lista membri, inviti | member/invitation (esistente) |

---

## Flussi Utente

### Flusso 1: Onboarding organizzazione

**Attore**: Platform Admin + Organization Owner
**Trigger**: Firma contratto B2B

1. Platform Admin crea organizzazione dal pannello admin (nome, limiti tecnici)
2. Platform Admin crea utente Owner (email fornita nel contratto)
3. Owner riceve email con link per impostare password
4. Owner accede e viene guidato dal wizard onboarding
5. Owner configura profilo aziendale (ragione sociale, contatti, ecc.)
6. Owner configura stile/branding (colori aurora, header, bottoni)
7. Owner accede alla dashboard dell'organizzazione

### Flusso 2: Creazione e gestione vCard

**Attore**: Organization Owner/Admin
**Trigger**: Necessita di creare un biglietto da visita per un dipendente

1. Owner/Admin accede alla sezione vCard
2. Clicca "Aggiungi vCard" — si apre sheet laterale
3. Compila dati: nome, cognome, ruolo, email, telefono, LinkedIn, foto
4. Opzionalmente collega a un member esistente (user_id)
5. Salva — la vCard e attiva e raggiungibile via URL pubblico
6. Copia il link pubblico o lo condivide al dipendente

### Flusso 3: Invito member e collegamento vCard

**Attore**: Organization Owner/Admin
**Trigger**: Nuovo dipendente da aggiungere

1. Owner/Admin invita il dipendente via email (sezione Membri)
2. Dipendente riceve email, imposta password, accede
3. Owner/Admin collega la vCard al nuovo member (user_id)
4. Member puo ora modificare la propria vCard dalla dashboard

### Flusso 4: Gestione card fisiche

**Attore**: Platform Admin + Organization Owner
**Trigger**: Ordine di card fisiche NFC

1. Platform Admin genera batch di N card fisiche dal pannello admin e le assegna all'org
2. Owner accede alla sezione Card fisiche
3. Owner seleziona una card libera e la collega a una vCard esistente → status diventa `assigned`
4. Card fisica viene distribuita al dipendente
5. In caso di smarrimento: Owner disattiva la card → status `disabled`
6. Owner puo collegare una nuova card alla stessa vCard

### Flusso 5: Visitatore scansiona card NFC/QR

**Attore**: Visitatore (contatto finale)
**Trigger**: Tap NFC o scansione QR code

1. Visitatore avvicina smartphone alla card NFC (o scansiona QR)
2. Browser apre `/code/XXXX-XXXX`
3. Piattaforma risolve il codice e reindirizza a `/{slug-org}/{slug-vcard}`
4. Visitatore vede la pagina pubblica con contatti e dati aziendali
5. Visitatore clicca "Aggiungi contatto" → download file .vcf → salva in rubrica
6. Oppure clicca QR code per condividere il link ad altri

---

## Pannello Admin — Estensioni

Il pannello admin esistente va esteso con:

### Gestione organizzazione (dettaglio)

- **Limiti tecnici**: campo per impostare max_vcards e max_physical_cards
- **Generazione card fisiche**: bottone "Genera batch" con input quantita (1-500), genera codici univoci e li assegna all'org
- **Statistiche**: vCard utilizzate/totali, card fisiche per stato
- **Lista vCard**: consultazione vCard dell'org (read-only o con possibilita di creazione)
- **Lista card fisiche**: gestione completa (assegna, scollega, disattiva, riattiva)

### Dashboard admin globale

- Statistiche aggregate: totale organizzazioni, totale vCard attive, totale card fisiche per stato

---

## Moduli di riferimento

Pattern esistenti nel kit da usare come reference durante l'implementazione:

- **Lead module** (`trpc/routers/leads.ts`, `app/(saas)/dashboard/organization/leads/`) — Pattern CRUD completo: tabella, sheet, filtri, import/export
- **Organization settings** (`app/(saas)/dashboard/organization/settings/`) — Pattern settings a tab con form multipli
- **Organizations grid** (`app/(saas)/dashboard/organizations/`) — Pattern griglia card con selezione
- **Onboarding** (`app/(saas)/dashboard/onboarding/`) — Pattern wizard multi-step
- **vcards-superpowers** (`D:\Github\vcards-superpowers\apps\web\app\[accountSlug]`) — Reference per pagina pubblica vCard

## Note implementazione

### Ordine consigliato di implementazione

1. **DB + Config**: Migrazioni per le 4 entita, enum, RLS policies, trigger auto-create per org_profile e org_style. Feature flags e app config.
2. **Profilo aziendale + Stile**: Tab nelle impostazioni org (entita semplici, 1:1 con org)
3. **vCard CRUD**: Router tRPC, tabella, sheet, gestione status
4. **Pagina pubblica vCard**: Route `/{slug-org}/{slug-vcard}`, rendering contatti + azienda, download .vcf, QR code
5. **Card fisiche**: Tabella, gestione stati, generazione batch (pannello admin)
6. **Redirect card fisica**: Route `/code/XXXX-XXXX` → resolve → redirect
7. **Pannello admin esteso**: Limiti tecnici, statistiche, gestione vCard/card per org
8. **Onboarding wizard**: Personalizzazione wizard per profilo aziendale + branding
9. **Pulizia**: Rimozione modulo leads, billing, aiChatbot

### Edge case e considerazioni

- **Slug univocita**: lo slug vCard deve essere unico per organizzazione (UNIQUE constraint su `organization_id` + `slug`)
- **Codici card fisiche**: generare con charset non ambiguo (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ` — esclusi 0,1,O,I), verificare univocita globale
- **Limiti tecnici**: controllare max_vcards alla creazione vCard, max_physical_cards alla generazione batch
- **Cascade delete**: eliminando un'org si eliminano vCard, card fisiche, profilo aziendale, stile
- **Pagina pubblica vCard sospesa/archiviata**: mostrare pagina "non attiva" invece di 404
- **Card fisica disabled**: mostrare pagina "card non attiva" al posto del redirect
- **Upload immagini**: profilo vCard su Supabase Storage, path `{userId}/{uuid}.png` (pattern esistente)

### Moduli da rimuovere

- **Lead module** — rimuovere routes, tRPC router, componenti, schema Zod, migrazione
- **AI Chatbot module** — rimuovere routes, tRPC router, componenti
- **Billing module** — rimuovere routes, tRPC router, componenti, config, webhook Stripe

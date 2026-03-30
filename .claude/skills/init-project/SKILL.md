---
name: init-project
description: Inizializza un nuovo progetto partendo dallo starter kit. Raccoglie requisiti tramite domande guidate (discovery, strutturazione, validazione) e genera uno spec completo per l'implementazione.
---

# Init Project

Skill per inizializzare un nuovo progetto derivato dallo starter kit.

## Prerequisiti

Prima di iniziare, LEGGERE questi documenti per comprendere il kit:
- `docs/MODULES.md` — moduli disponibili, feature flag, dipendenze
- `docs/UI-PATTERNS.md` — pattern UI riutilizzabili con code reference
- `docs/ADDING-ENTITY.md` — come si aggiunge una nuova entita CRUD
- `CLAUDE.md` — convenzioni del progetto (naming, stile, lingua italiana)

## Principi

- **Una domanda alla volta** — Non sovraccaricare l'utente
- **Ascolta prima, struttura dopo** — Le domande aperte vengono prima di quelle tecniche
- **Consiglia attivamente** — Non chiedere solo "vuoi X?", di' "consiglio X perche Y"
- **Riformula per conferma** — Dopo ogni risposta, riformula brevemente e chiedi conferma
- **Se l'utente non sa, proponi un default** — "Se non sei sicuro, possiamo partire con X e cambiare dopo"

## Fasi

### Fase 1 — Discovery (domande aperte)

Obiettivo: capire il progetto a livello alto prima di entrare nei dettagli tecnici.

**Domande core** — porre UNA ALLA VOLTA, aspettare la risposta prima di procedere:

1. "Descrivi il progetto in poche frasi — cosa fa e per chi e pensato?"
2. "Quali sono le funzionalita principali che vuoi implementare?"
3. "Come immagini il flusso tipico di un utente?"
4. "Ci sono vincoli particolari? (settore, compliance, integrazioni esterne, deadline)"
5. "C'e un modello di business? (gratis, freemium, abbonamento, per-seat, crediti a consumo)"

**Dopo ogni risposta:**
- Riformula brevemente: "Quindi, se ho capito bene: [riformulazione]. Corretto?"
- Annota mentalmente: entita identificate, flussi, ruoli, vincoli
- Se la risposta e vaga, fai una domanda di follow-up mirata

**Follow-up per risposte vaghe:**
- "Puoi farmi un esempio concreto di come un utente userebbe questa funzionalita?"
- "Chi sono gli attori principali? Solo un tipo di utente o piu ruoli?"
- "Questa funzionalita e core (giorno 1) o nice-to-have (fase successiva)?"

**Gestione "non so ancora":**
- Per il business model: "Partiamo con freemium — e il modello piu flessibile, possiamo cambiare dopo"
- Per i vincoli: "Ok, procediamo senza vincoli particolari. Se ne emergono li aggiungiamo"
- Per i flussi: "Proporro un flusso standard basato su progetti simili, lo rivediamo insieme"

**Chiusura Fase 1:**
Presentare un riepilogo strutturato:

```
## Riepilogo Discovery

**Progetto**: [nome/descrizione breve]
**Target**: [utenti tipo]

**Entita identificate**: [lista]
**Flussi principali**: [lista]
**Ruoli**: [lista]
**Vincoli**: [lista o "nessuno"]
**Business model**: [tipo]
```

Chiedere: "Questo riepilogo cattura tutto? Manca qualcosa?"

### Fase 2 — Strutturazione (domande mirate)

Obiettivo: trasformare le risposte della discovery in decisioni tecniche concrete.

#### 2a. Configurazione moduli

1. Leggere `docs/MODULES.md` per avere il quadro completo dei moduli disponibili
2. Presentare una tabella dei moduli con raccomandazione per-modulo basata sulla discovery:

```
| Modulo | Raccomandazione | Motivo |
|--------|----------------|--------|
| billing | true | Modello freemium richiede Stripe |
| leads | false | Non pertinente al progetto |
| aiChatbot | false | Nessun requisito AI emerso |
| onboarding | true | Flusso guidato per nuovi utenti |
| publicRegistration | true | Registrazione aperta |
| multiOrg | true | Progetto multi-team |
| personalAccountOnly | false | Team/org necessari |
| googleAuth | false | Solo email/password per ora |
```

3. Spiegare le implicazioni delle dipendenze tra moduli (es. `personalAccountOnly=true` forza `multiOrg=false`)
4. Chiedere conferma: "Questa configurazione ti sembra corretta? Vuoi cambiare qualcosa?"

#### 2b. Entita del nuovo progetto

Per ogni entita identificata nella discovery, chiedere UNA DOMANDA ALLA VOLTA:

1. **Campi**: "Per [entita], quali informazioni deve contenere? (es. nome, descrizione, stato, data...)"
   - Proporre campi standard basati sul tipo di entita
   - Ricordare che `id`, `organization_id`, `created_at`, `updated_at` sono automatici

2. **Permessi**: "Chi puo fare cosa con [entita]?"
   - Proporre opzioni concrete, non chiedere in astratto:
     - "Tutti i membri vedono tutto, ma solo admin modificano"
     - "Ogni membro vede solo i propri, admin vedono tutto"
     - "Tutti vedono e modificano tutto"
   - Consultare `questions.md` per mappare la risposta al pattern RLS

3. **Relazioni**: "A cosa e collegata [entita]?"
   - Proporre relazioni comuni: appartiene all'org, assegnata a un utente, collegata ad altra entita
   - Consultare `questions.md` per mappare al pattern DB

4. **Stati/Workflow**: "[Entita] ha degli stati o un flusso di lavoro?"
   - Se si: chiedere quali stati e le transizioni possibili
   - Se no: "Ok, nessun workflow — l'entita e semplicemente attiva o eliminata"

#### 2c. Pattern UI

1. Leggere `docs/UI-PATTERNS.md` per i pattern disponibili
2. Per ogni entita, proporre il pattern piu adatto con motivazione:
   - "Per [entita] consiglio il Pattern A (Tabella CRUD con Sheet) perche ha molti record, filtri e azioni rapide"
   - "Per le impostazioni consiglio il Pattern B (Settings a Tab) perche raggruppa configurazioni diverse"
3. Consultare `questions.md` per la matrice caratteristiche -> pattern
4. Chiedere conferma per ogni scelta

#### 2d. Personalizzazione

Domande finali di configurazione:

1. "Come si chiama l'app?" (suggerire basandosi sul progetto)
2. "Hai gia un dominio?" (default: localhost per dev)
3. Se billing=true: "Quali piani vuoi offrire? (es. Free + Pro, oppure solo Pro)"
   - Proporre struttura piani basata sul business model dalla discovery

### Fase 3 — Validazione e generazione spec

#### 3a. Riepilogo finale

Presentare un riepilogo completo e strutturato di TUTTE le decisioni:

```
## Riepilogo Completo

### Configurazione
- Feature flags: [tabella]
- App: [nome, url]
- Billing: [piani]

### Entita
Per ogni entita:
- Campi: [lista]
- Permessi: [matrice]
- Relazioni: [lista]
- Stati: [lista o nessuno]
- Pattern UI: [pattern scelto]

### Flussi
- [flusso 1]: [step]
- [flusso 2]: [step]
```

Chiedere: "Tutto confermato? Posso generare lo spec?"

#### 3b. Generazione spec

1. Usare il template `spec-template.md` come base
2. Sostituire tutti i placeholder `[...]` con i dati raccolti
3. Salvare in: `docs/superpowers/specs/YYYY-MM-DD-init-[nome-progetto]-spec.md`
   - Usare la data corrente
   - Usare il nome progetto in kebab-case
4. Mostrare il path del file generato
5. Chiedere: "Vuoi rivedere lo spec prima di procedere?"

#### 3c. Passaggio al piano di implementazione

Una volta che l'utente conferma lo spec:
1. Comunicare: "Spec approvato! Ora genero il piano di implementazione."
2. Invocare la skill `superpowers:writing-plans` passando il path dello spec come contesto

## Regole importanti

- Parlare SEMPRE in italiano (l'UI del kit e in italiano)
- Usare snake_case per nomi di colonne e tabelle DB
- Usare kebab-case per nomi di file
- Usare PascalCase per componenti React
- Consultare `questions.md` per le mappature risposte -> decisioni tecniche
- Consultare `spec-template.md` per il formato dello spec
- Non procedere alla fase successiva senza conferma esplicita dell'utente
- Se l'utente cambia idea su una decisione precedente, aggiornare tutto il contesto di conseguenza

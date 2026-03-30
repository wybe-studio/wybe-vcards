# Questions Reference — Init Project

Documento di riferimento per mappare le risposte dell'utente a decisioni tecniche.

## Fase 1 — Domande Discovery

### Domande obbligatorie

| # | Domanda | Obiettivo |
|---|---------|-----------|
| 1 | "Descrivi il progetto in poche frasi — cosa fa e per chi e pensato?" | Capire scope e target |
| 2 | "Quali sono le funzionalita principali che vuoi implementare?" | Identificare entita e moduli |
| 3 | "Come immagini il flusso tipico di un utente?" | Mappare user journey |
| 4 | "Ci sono vincoli particolari? (settore, compliance, integrazioni esterne, deadline)" | Identificare limiti tecnici |
| 5 | "C'e un modello di business? (gratis, freemium, abbonamento, per-seat, crediti a consumo)" | Configurare billing |

### Domande opzionali (follow-up)

Usare quando la risposta alla domanda obbligatoria e vaga o incompleta:

| Trigger | Follow-up |
|---------|-----------|
| Funzionalita vaghe | "Puoi farmi un esempio concreto di come un utente userebbe questa funzionalita?" |
| Ruoli non chiari | "Chi sono gli attori principali? Solo un tipo di utente o piu ruoli?" |
| Priorita non chiare | "Questa funzionalita e core (giorno 1) o nice-to-have (fase successiva)?" |
| Flusso generico | "Cosa succede dopo che l'utente fa [azione]? Dove va?" |
| Integrazioni menzionate | "Questa integrazione e critica per il lancio o puo venire dopo?" |

### Default per "non so ancora"

| Domanda | Default proposto |
|---------|-----------------|
| Business model | "Partiamo con freemium — e il modello piu flessibile, possiamo cambiare dopo" |
| Vincoli | "Ok, procediamo senza vincoli particolari. Se ne emergono li aggiungiamo" |
| Flusso utente | "Proporro un flusso standard basato su progetti simili, lo rivediamo insieme" |
| Ruoli | "Partiamo con owner/admin/member — copre la maggior parte dei casi" |
| Funzionalita | "Concentriamoci sulla funzionalita core, il resto lo aggiungiamo iterativamente" |

## Fase 2 — Mappature risposte -> decisioni tecniche

### Permessi -> Pattern RLS

| Risposta utente | Pattern RLS | Policy SQL |
|----------------|-------------|------------|
| "Tutti i membri vedono tutto" | Membership check | `is_organization_member(organization_id)` |
| "Ogni utente vede solo i suoi" | Owner-only read | `user_id = auth.uid()` per SELECT |
| "Admin vede tutto, member solo i propri" | Role-based read | `has_org_role(organization_id, 'admin') OR user_id = auth.uid()` |
| "Solo admin possono modificare" | Role-based write | SELECT: `is_organization_member(...)`, UPDATE/DELETE: `has_org_role(..., 'admin')` |
| "Solo owner puo eliminare" | Owner-only delete | DELETE: `has_org_role(..., 'owner')` |
| "Chiunque nell'org puo fare tutto" | Full org access | SELECT/INSERT/UPDATE/DELETE: `is_organization_member(organization_id)` |
| "Admin crea e modifica, member solo legge" | Admin write, member read | SELECT: `is_organization_member(...)`, INSERT/UPDATE: `has_org_role(..., 'admin')`, DELETE: `has_org_role(..., 'admin')` |

### Relazioni -> Schema DB

| Risposta utente | Pattern DB | SQL |
|----------------|------------|-----|
| "Appartiene all'organizzazione" | FK a organization | `organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE` |
| "Puo essere assegnata a un membro" | FK nullable a users | `assigned_to_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` |
| "Ha un creatore/autore" | FK a users | `created_by_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL` |
| "Relazione 1:1 con org" | PK come FK | `organization_id uuid PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE` |
| "Ha molti sotto-elementi" | Tabella figlia con FK | Nuova tabella con `parent_id uuid NOT NULL REFERENCES parent_table(id) ON DELETE CASCADE` |
| "Puo avere tag/categorie" | Tabella di join | Tabella `entity_tag` con FK a entrambe le tabelle |
| "Collegata ad altra entita" | FK diretta | `related_entity_id uuid REFERENCES other_table(id) ON DELETE SET NULL` |

### Stati -> Enum e colonne

| Risposta utente | Pattern DB | SQL |
|----------------|------------|-----|
| "Ha degli stati" | Enum custom | `CREATE TYPE entity_status AS ENUM (...)` + colonna `status entity_status NOT NULL DEFAULT '...'` |
| "Bozza/pubblicato" | Enum standard publish | `CREATE TYPE entity_status AS ENUM ('draft', 'published', 'archived')` |
| "Aperto/chiuso" | Enum ticket-style | `CREATE TYPE entity_status AS ENUM ('open', 'in_progress', 'closed')` |
| "Attivo/disattivo" | Boolean | `is_active boolean NOT NULL DEFAULT true` |
| "Nessun workflow" | Nessuna colonna stato | Solo soft-delete se necessario |
| "Ha priorita" | Enum priorita | `CREATE TYPE entity_priority AS ENUM ('low', 'medium', 'high', 'urgent')` |
| "Ha date di scadenza" | Colonna data | `due_date timestamptz` |

### Business model -> Feature flags

| Risposta utente | Configurazione feature flags |
|----------------|------------------------------|
| "Gratis" | `billing=false` |
| "Freemium" | `billing=true`, piano Free (limiti) + piano Pro |
| "Solo a pagamento" | `billing=true`, `publicRegistration=false`, solo piano Pro |
| "Abbonamento mensile/annuale" | `billing=true`, piani con interval month/year |
| "Per-seat" | `billing=true`, piano con `per_seat=true` |
| "Crediti a consumo" | `billing=true`, `aiChatbot=true`, piano con crediti |
| "Prova gratuita poi pagamento" | `billing=true`, piano Free con trial period |

### Tipo progetto -> Feature flags

| Risposta utente | Configurazione feature flags |
|----------------|------------------------------|
| "Un utente = un account" | `personalAccountOnly=true`, `multiOrg=false` |
| "Team/organizzazioni" | `multiOrg=true`, `personalAccountOnly=false` |
| "Solo su invito" | `publicRegistration=false` |
| "Registrazione aperta" | `publicRegistration=true` |
| "Con Google login" | `googleAuth=true` |
| "Solo email/password" | `googleAuth=false` |
| "Con onboarding guidato" | `onboarding=true` |
| "Accesso diretto alla dashboard" | `onboarding=false` |

### Caratteristiche entita -> Pattern UI

| Caratteristiche entita | Pattern consigliato | Motivo |
|-----------------------|---------------------|--------|
| Lista CRUD con filtri, molti record, azioni rapide | **A — Tabella CRUD con Sheet** | Tabella ottimizzata per browse, filter, bulk actions |
| Impostazioni raggruppate per categoria | **B — Settings a Tab** | Tab organizzano sezioni diverse di config |
| Selezione da una collezione, overview visuale | **C — Griglia Card** | Card danno preview visuale immediata |
| Flusso guidato step-by-step, raccolta dati progressiva | **E — Wizard Multi-step** | Wizard riduce cognitive load su processi complessi |
| Mix di informazioni + azioni su singolo record | **Detail page custom** | Layout ad-hoc per record complessi |
| Dashboard con metriche e grafici | **Dashboard layout** | Widget e chart per overview |

### Combinazioni comuni

| Tipo progetto | Feature flags tipici | Entita comuni |
|--------------|---------------------|---------------|
| SaaS B2B | multiOrg, billing, onboarding | workspace settings, team members, risorse core |
| Marketplace | multiOrg, billing, publicRegistration | prodotti/servizi, ordini, recensioni |
| Tool interno | personalAccountOnly, no billing, no publicRegistration | risorse specifiche del dominio |
| Community platform | multiOrg, publicRegistration, no billing | post, commenti, profili |
| CRM | multiOrg, billing, leads attivo | contatti, deal, attivita |

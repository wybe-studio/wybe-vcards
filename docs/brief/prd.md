# PRD – Web App vCard aziendali con card NFC

## 1. Contesto e obiettivi

Le digital business card sono profili digitali che permettono di condividere i propri contatti tramite link, QR code, NFC o file vCard, aggiornabili in tempo reale e integrabili con altri strumenti. L'uso di card fisiche NFC che puntano a profili digitali è sempre più diffuso nelle aziende, perché consente di separare il supporto fisico dal contenuto e aggiornare i dati senza ristampare biglietti.

Obiettivo del prodotto:

- Fornire alle PMI (10–200 dipendenti) una piattaforma multi-tenant per gestire vCard digitali aziendali collegate a card fisiche NFC non personalizzate per singolo dipendente.
- Consentire a Owner/Admin di ogni organizzazione di creare, aggiornare e revocare vCard e card fisiche in autonomia, mantenendo controllo su branding e campi obbligatori.
- Ridurre i costi e i tempi legati alla stampa di biglietti nominativi e gestire facilmente turnover, smarrimenti e ri-assegnazioni di card.
- Gestire l'onboarding dei clienti esclusivamente tramite attivazione manuale da parte del Platform Admin, a valle di un contratto commerciale dedicato (nessuna registrazione pubblica/self-service).

---

## 2. Modello commerciale e onboarding

### 2.1 Modello commerciale

- La piattaforma è venduta con contratti B2B ad hoc (no self-service sign-up, no billing in-app).
- Pricing, limiti di card/vCard e condizioni sono definiti nel contratto commerciale tra fornitore e azienda cliente.
- Il PRD descrive solo i **limiti tecnici configurabili** e i ruoli di gestione, non la parte di pagamenti/fatturazione.

### 2.2 Onboarding cliente (organizzazione)

- Dopo la firma del contratto, il **Platform Super Admin** crea:
  - la nuova organizzazione con i relativi limiti tecnici (massimo vCard, massimo card fisiche),
  - l'utente Owner dell'organizzazione, usando l'email di riferimento fornita in fase contrattuale.
- Il Super Admin invia (manualmente o tramite funzione di invito) le credenziali iniziali / link di attivazione all'Owner.
- Non esiste alcuna pagina di registrazione pubblica per creare organizzazioni o account.

### 2.3 Onboarding utenti interni (membri)

- Gli utenti interni (Admin, Member) sono creati esclusivamente da Owner/Admin dell'organizzazione.
- L'accesso avviene tramite invito email con link dedicato per impostare la password.
- Anche per i Member non è presente un form di signup pubblico: si accede solo tramite invito.

---

## 3. Target e personas

### 3.1 Target principale

- PMI (10–200 dipendenti), con forza vendita, consulenti o personale che incontra spesso clienti/partner.
- Settori tipici: servizi B2B, agenzie, studi professionali, software house, manifatturiero con reti commerciali.

### 3.2 Personas

- **Platform Super Admin**
  - Gestisce l'intera piattaforma SaaS lato fornitore.
  - Crea e configura le organizzazioni, assegna limiti tecnici (vCard, card fisiche), abilita/disabilita accessi.
- **Organization Owner / Admin**
  - Referente dell'azienda cliente (es. responsabile marketing o IT).
  - Configura il branding, definisce il template delle vCard, crea/gestisce utenti interni, assegna e revoca card fisiche.
- **Member / Utente associato a vCard**
  - Dipendente o collaboratore a cui è assegnata una vCard.
  - Può aggiornare in autonomia parte dei propri dati, entro i limiti definiti dall'organizzazione.
- **Contatto finale (recipient)**
  - Persona che riceve la vCard (via NFC, QR, link) e la salva tra i propri contatti.
  - Non ha account sulla piattaforma.

---

## 4. Value proposition

- **Per le PMI:**
  - Gestione centralizzata e scalabile delle card aziendali.
  - Nessuna ristampa a ogni cambio ruolo o turnover.
  - Branding coerente su tutte le vCard del team.
- **Per i dipendenti:**
  - Un unico link/card sempre aggiornato, con tutti i canali di contatto rilevanti.
  - Condivisione immediata via NFC/QR/link senza app dedicate.
- **Per il fornitore:**
  - Modello enterprise/B2B con onboarding gestito via contratti e attivazioni manuali, coerente con scenari high-touch B2B.

---

## 5. Scope MVP

### 5.1 In scope

- Multi-tenant con entità Organization e Profile/User con ruoli base (Owner, Admin, Member).
- Creazione e gestione di vCard digitali per organizzazione.
- Collegamento opzionale di una vCard a:
  - un utente autenticato (self-service update dei dati limitati),
  - una card fisica identificata da codice alfanumerico univoco nel formato `XXXX-XXXX`.
- Gestione del ciclo di vita delle card fisiche (creazione batch, assegnazione a vCard, disattivazione/smarrito).
- Gestione limiti tecnici per organizzazione: numero massimo di vCard digitali e card fisiche attivabili.
- Export CSV dei codici delle card fisiche generati per un'organizzazione.
- Onboarding basato su invito per Owner/Admin/Member (nessun signup pubblico).

### 5.2 Out of scope (post-MVP)

- Qualsiasi funzionalità di billing o pagamento self-service.
- Analytics avanzate (visualizzazioni card, click su link, performance per utente).
- Lead capture avanzato (form, note, qualificazione lead, export CSV lead CRM-ready).
- Integrazioni CRM dirette (HubSpot, Salesforce, ecc.).
- App mobile dedicata (web app responsive sufficiente inizialmente).
- Integrazione Apple Wallet / Google Wallet per salvare card nel wallet.
- Custom domain per card (es. card.azienda.it) e white-label esteso.
- Multi-lingua completa dell'interfaccia (MVP almeno italiano, estendibile a inglese).

---

## 6. Funzionalità incluse — Analisi del progetto di riferimento

Questa sezione documenta le funzionalità già presenti nel progetto di riferimento (vcards-superpowers / "Supernova"), organizzate per area. L'analisi è puramente funzionale: descrive cosa l'utente può fare, senza entrare nell'implementazione tecnica.

### 6.1 Sito pubblico e marketing

Il progetto include un sito pubblico completo, pensato per presentare il prodotto e attirare potenziali clienti. Le sezioni disponibili sono:

- **Homepage** con panoramica delle funzionalità principali, vantaggi e call-to-action.
- **FAQ** per rispondere alle domande più comuni.
- **Pagina contatti** con form per richieste commerciali.
- **Blog** con indice articoli e pagine di dettaglio, utile per SEO e content marketing.
- **Changelog** per comunicare aggiornamenti e novità del prodotto.

### 6.2 Autenticazione e accesso

Nel contesto del modello B2B senza registrazione pubblica, i metodi di signup verranno disattivati: l'accesso avviene esclusivamente tramite invito. I metodi di login restano disponibili per gli utenti già invitati.

### 6.3 Pagina pubblica della vCard

Questa è l'esperienza che vive chi riceve il biglietto da visita — il "prodotto finale" visibile al mondo esterno. La pagina è accessibile senza login, tramite link diretto, QR code o tap NFC.

**Aspetto visivo:**
La pagina presenta un'intestazione con foto profilo, nome, ruolo e logo aziendale, il tutto su uno sfondo animato con effetto "aurora" (gradiente dinamico) i cui colori sono personalizzabili dall'azienda. L'effetto dona un aspetto moderno e distintivo rispetto ai classici biglietti da visita digitali statici.
**Per la parte pubblica possiamo replicare esattamente pagina e componenti di questo esempio D:\Github\vcards-superpowers\apps\web\app\[accountSlug]**

**Contenuto organizzato in schede:**

- **Scheda "Contatti"**: raccoglie le informazioni personali del dipendente — telefono cellulare, telefono ufficio, email, profilo LinkedIn. Ogni voce è cliccabile (avvia chiamata, apre client email, apre LinkedIn).
- **Scheda "Azienda"**: mostra i dati dell'organizzazione — telefono aziendale, email aziendale, sito web, LinkedIn aziendale, indirizzo sede, ragione sociale, PEC, partita IVA, codice SDI, sede legale. Anche qui ogni voce è interattiva.

**Azioni disponibili per il visitatore:**

- **"Aggiungi contatto"**: scarica un file `.vcf` che, su smartphone, salva automaticamente il contatto in rubrica con tutti i dati compilati. Su desktop viene scaricato come file.
- **QR code**: un pulsante apre un dialogo con un QR code scannerizzabile che punta alla stessa vCard, utile per condividere il contatto in modo rapido anche senza card fisica.
- **Copia negli appunti**: ogni singolo campo (telefono, email, indirizzo, ecc.) ha un pulsante per copiarlo rapidamente.

**Formato URL:**
L'indirizzo della vCard pubblica segue il pattern `/{slug-organizzazione}/{slug-vcard}`, dove lo slug della vCard può essere in formato leggibile (es. `mario.rossi`) oppure UUID, a scelta dell'organizzazione. La possibilità di scegliere slug leggibili rende gli URL più professionali e facili da ricordare.

### 6.4 Card fisiche NFC/QR

Il sistema di card fisiche è il cuore logistico del prodotto, poiché collega il mondo fisico (la card NFC/QR in mano al dipendente) al profilo digitale sulla piattaforma.

**Come funziona:**
Ogni card fisica è identificata da un codice univoco nel formato `XXXX-XXXX`, generato con un set di caratteri privo di ambiguità (esclusi caratteri facilmente confondibili come O/0, I/1). Quando qualcuno avvicina lo smartphone alla card NFC o ne scansiona il QR code, viene indirizzato a un URL del tipo `/code/XXXX-XXXX`. La piattaforma risolve il codice e reindirizza alla pagina pubblica della vCard associata.

**Ciclo di vita delle card:**

- **Libera** (`free`): la card è stata generata e assegnata all'organizzazione, ma non ancora collegata a una vCard. Il codice esiste ma non porta da nessuna parte.
- **Assegnata** (`assigned`): la card è collegata a una vCard specifica. Il tap/scan porta alla pagina pubblica del dipendente.
- **Disattivata** (`disabled`): la card è stata disabilitata (smarrimento, cessazione rapporto, ecc.). Chi la scansiona vede una pagina che informa che la card non è attiva.

Le transizioni sono bidirezionali: una card disattivata può essere riattivata, una card assegnata può essere scollegata e riassegnata a un'altra vCard. Questo modello copre tutti i casi d'uso aziendali più comuni: turnover del personale, smarrimenti, riassegnazione ruoli.

**Gestione da parte dell'Owner:**
Il proprietario dell'organizzazione ha una sezione dedicata dove vede tutte le card fisiche assegnate alla propria azienda, con filtri per stato (libere, assegnate, disattivate) e ricerca per codice o nome del dipendente. Da qui può collegare una card a una vCard, scollegarla, disattivarla o riattivare una card precedentemente disabilitata.

**Dashboard di riepilogo:**
La home dell'organizzazione mostra un widget con le statistiche delle card fisiche: quante assegnate, quante totali, quante disponibili. Questo dà all'Owner una visione immediata della situazione senza entrare nella gestione dettagliata.

### 6.5 Gestione vCard (area riservata)

L'area riservata per la gestione delle vCard è il "pannello di controllo" quotidiano dell'organizzazione.

**Creazione e modifica vCard:**
Owner e Admin possono creare nuove vCard compilando: nome completo, ruolo/posizione, email, telefono principale, telefono secondario, URL LinkedIn e foto profilo (con upload di immagini fino a 5 MB nei formati JPG, PNG, WebP, GIF). Ogni vCard può essere associata a un membro del team, in modo che quest'ultimo possa in futuro modificare autonomamente i propri dati.

**Elenco e ricerca:**
Le vCard dell'organizzazione sono visualizzate in una tabella con ricerca per nome, email o ruolo, ordinamento per diverse colonne e paginazione. Per ogni vCard sono disponibili azioni rapide: copia del link pubblico, apertura della pagina pubblica, modifica ed eliminazione.

**Sistema di licenze:**
Ogni organizzazione ha un numero massimo di vCard attivabili, definito dal Super Admin. La piattaforma controlla questo limite: quando l'organizzazione ha raggiunto il massimo, la creazione di nuove vCard viene bloccata e l'utente vede un messaggio che spiega la situazione. Un indicatore nell'area dashboard mostra chiaramente quante licenze sono utilizzate rispetto al totale disponibile (es. "8 / 10 vCard utilizzate").

**Ruoli e permessi:**

- L'Owner vede e gestisce tutte le vCard dell'organizzazione, le card fisiche, il profilo aziendale e lo stile.
- I Member vedono solo la dashboard e la lista vCard, e possono modificare esclusivamente la vCard associata al proprio account.

### 6.6 Profilo aziendale

L'Owner/Admin dispone di una sezione dedicata per configurare i dati dell'azienda che vengono mostrati sulla scheda "Azienda" di ogni vCard pubblica. Si tratta di informazioni condivise a livello di organizzazione, non del singolo dipendente.

I dati configurabili coprono diverse aree:

- **Identità legale**: ragione sociale, partita IVA, codice fiscale, codice ATECO, sede legale, note interne.
- **Contatti operativi**: telefono, email, PEC (posta elettronica certificata), sito web, LinkedIn, Facebook, Instagram, indirizzo operativo, contatto amministrativo (nome ed email di riferimento).
- **Dati di fatturazione**: codice SDI, IBAN, nome della banca.
- **Logo aziendale**: caricamento immagine (fino a 10 MB, formati JPG, PNG, WebP, SVG) che appare nell'intestazione di tutte le vCard dell'organizzazione.

Questa centralizzazione garantisce che tutte le vCard mostrino dati aziendali coerenti e aggiornati, senza che ogni dipendente debba inserirli manualmente.

### 6.7 Personalizzazione grafica (branding)

Ogni organizzazione può personalizzare l'aspetto delle proprie vCard pubbliche per allinearlo all'identità visiva aziendale. La personalizzazione avviene a livello di organizzazione e si applica a tutte le vCard.

**Colori personalizzabili:**

- Colore primario e colore secondario dell'effetto aurora (lo sfondo animato).
- Colore di sfondo e colore testo dell'intestazione della vCard.
- Colore di sfondo e colore testo del pulsante "Aggiungi contatto".
- Colore di sfondo della barra delle schede (Contatti / Azienda).

Questo livello di personalizzazione, pur senza essere un white-label completo, consente a ogni azienda di avere vCard riconoscibili e coerenti con il proprio brand. I sette parametri colore offrono un controllo granulare sull'aspetto senza richiedere competenze grafiche: basta scegliere i colori aziendali.

**Formato URL:**
L'organizzazione può scegliere se le nuove vCard usino URL leggibili basati sul nome (es. `/acme/mario.rossi`) oppure URL basati su UUID (più anonimi ma garantiti univoci). Questa scelta può essere impostata come default per l'organizzazione e sovrascritta vCard per vCard.

### 6.8 Gestione team e inviti

La gestione dei membri del team permette all'Owner/Admin di:

- **Invitare nuovi membri** tramite email, assegnando un ruolo al momento dell'invito.
- **Visualizzare gli inviti in sospeso** (chi è stato invitato ma non ha ancora accettato).
- **Gestire i ruoli** dei membri già presenti.
- **Rimuovere membri** dall'organizzazione.

Il flusso di invito è l'unico modo per aggiungere persone all'organizzazione: non esiste registrazione pubblica. Il membro invitato riceve un'email con un link per impostare la propria password e accedere alla piattaforma.

### 6.9 Impostazioni account

**Impostazioni dell'organizzazione:**

- Modifica del nome dell'organizzazione.
- Aggiornamento del logo.
- Modifica dello slug (la parte dell'URL che identifica l'organizzazione).
- Eliminazione dell'organizzazione (se abilitata dall'admin).

**Impostazioni personali dell'utente:**

- Aggiornamento nome visualizzato e avatar.
- Cambio email (se autenticazione con password).
- Cambio password.
- Collegamento/scollegamento provider OAuth (es. Google).
- Attivazione autenticazione a due fattori.
- Eliminazione dell'account personale (se abilitata).

### 6.10 Pannello Super Admin

Il Super Admin ha accesso a un pannello di amministrazione dedicato per gestire l'intera piattaforma.

**Dashboard globale:**
Panoramica generale con statistiche aggregate su organizzazioni, vCard e card fisiche attive sulla piattaforma.

**Gestione organizzazioni:**
Elenco ricercabile di tutti gli account (personali e team). Per ogni account team, una vista dettagliata organizzata in tre aree:

- **Informazioni e licenze**: gestione del limite di vCard (quante l'organizzazione può creare), generazione di batch di card fisiche da assegnare all'organizzazione (da 1 a 500 per volta), visualizzazione delle statistiche d'uso e dell'elenco dei membri del team.
- **VCard**: consultazione, ricerca e ordinamento di tutte le vCard dell'organizzazione; possibilità di crearne di nuove direttamente dal pannello admin.
- **Card fisiche**: gestione completa delle card fisiche dell'organizzazione — collegamento, scollegamento, disattivazione, riattivazione, ricerca e filtri per stato.

Il Super Admin può anche eliminare un'organizzazione dalla piattaforma.

---

## 7. Requisiti funzionali — livello piattaforma

### 7.1 Gestione Super Admin (piattaforma fornitore)

Funzioni principali (web app riservata al Super Admin):

1. **Autenticazione Super Admin**
   - Login con email/password.
2. **Gestione organizzazioni**
   - Creare nuova organizzazione con campi: ragione sociale, P.IVA opzionale, email amministrativa (Owner), logo, settore, paese.
   - Definire per ogni organizzazione:
     - limiti tecnici massimo vCard digitali attive,
     - limiti tecnici massimo card fisiche.
   - Modificare/sospendere un'organizzazione (hard lock che disabilita nuove assegnazioni e/o accesso all'area admin dell'organizzazione).
3. **Gestione limiti tecnici**
   - Pannello per visualizzare e aggiornare limiti per ogni organizzazione (in coerenza con il contratto commerciale esterno).
4. **Monitoring base**
   - Elenco organizzazioni con numero di vCard utilizzate, card fisiche generate e attive.

### 7.2 Nessun billing in-app

- Non sono presenti schermate di acquisto piano, inserimento carta di credito o gestione abbonamenti.
- Tutte le informazioni economiche sono esterne alla piattaforma; lato prodotto esistono solo limiti tecnici configurati dal Super Admin.

> **Nota:** Il progetto di riferimento include un sistema di billing completo (Stripe / Lemon Squeezy) con piani Starter/Pro/Enterprise ereditato dallo starter kit. Nel contesto del modello B2B senza self-service, questa parte andrà rimossa o disabilitata, mantenendo solo il sistema di licenze gestito manualmente dal Super Admin.

---

## 8. Requisiti funzionali — livello organizzazione

### 8.1 Onboarding organizzazione

- L'Owner riceve un'email dal fornitore con credenziali o link di attivazione.
- Al primo accesso, viene guidato su:
  - impostazione dati aziendali base (nome, logo, colori brand),
  - definizione template vCard predefinito.

### 8.2 Ruoli dentro l'organizzazione

- **Owner**
  - Tutti i permessi Admin.
  - Gestione impostazioni critiche dell'organizzazione (es. disattivazione, richiesta modifiche limiti da inoltrare al fornitore).
  - Accesso a: dashboard, vCard, card fisiche, profilo aziendale, personalizzazione stile, membri, impostazioni, billing.
- **Admin**
  - Gestisce utenti, vCard, card fisiche, branding, esportazioni.
- **Member**
  - Ha una o più vCard assegnate (in genere una) e può editare solo la vCard collegata al proprio account.
  - Accesso a: dashboard e lista vCard (solo le proprie).

### 8.3 Template vCard per organizzazione

Le piattaforme di vCard avanzate consentono personalizzazione dei template (logo, banner, colori, elenco campi, link social, CTA). Per l'MVP:

- L'organizzazione definisce un **template vCard** con:
  - Branding: logo, colore primario, colore sfondo, eventuale immagine di copertina.
  - Campi standard: nome, cognome, ruolo, reparto, email lavoro, telefono lavoro, sito web, indirizzo azienda.
  - Campi opzionali attivabili/disattivabili: mobile personale, link LinkedIn, altri social (Facebook, Instagram, YouTube, ecc.).
  - Campi personalizzati (es. "Area di competenza", "Sede"): definibili dall'Admin.
- Possibilità di definire per ogni campo se è:
  - bloccato dall'organizzazione (solo Admin può modificarlo),
  - editabile dal Member collegato alla vCard.

### 8.4 Gestione vCard digitali

Per ogni organizzazione:

- Creare nuova vCard con i seguenti attributi:
  - dati personali (nome, ruolo, email, telefono principale e secondario, LinkedIn, foto profilo),
  - stato: attiva, sospesa, archiviata,
  - eventuale utente collegato (membro del team),
  - eventuale card fisica collegata,
  - formato slug URL (leggibile basato sul nome, oppure UUID).
- Modificare/aggiornare i dati di una vCard (Admin, Owner; Member solo sulla propria vCard).
- Disattivare/archiviare una vCard (non più raggiungibile da URL/QR/NFC, o reindirizzata a pagina "disattivata").
- Copiare il link pubblico della vCard negli appunti.
- Visualizzare la pagina pubblica della vCard direttamente dalla gestione.

### 8.5 Associazione vCard ↔ utente autenticato

- Ogni vCard può essere collegata a un utente (Member) del sistema.
- Flussi supportati:
  - Admin crea vCard e contemporaneamente crea l'account utente, oppure collega vCard a utente esistente.
  - Invio email al Member con link per completare il profilo (login solo tramite invito, non pubblico).
- Il Member, una volta loggato, vede:
  - la dashboard dell'organizzazione,
  - elenco delle proprie vCard (in genere una),
  - possibilità di aggiornare solo la vCard associata al proprio account.

### 8.6 Gestione card fisiche

- Ogni organizzazione ha un limite massimo di **card fisiche** definito dal Super Admin.
- Le card fisiche sono identificate da un codice nel formato `XXXX-XXXX`, generato con un set di caratteri non ambiguo (esclusi O/0, I/1 e simili).
- Stati: `libera` → `assegnata` → `disattivata` (transizioni bidirezionali).

Funzionalità chiave:

1. **Generazione batch codici** (dal pannello Super Admin)
   - Il Super Admin genera un batch di N card fisiche (da 1 a 500 per volta) e le assegna a un'organizzazione.
   - Per ogni card viene generato un codice univoco sulla piattaforma.
   - Lo stato iniziale è `libera`.
2. **Associazione card fisica ↔ vCard** (dall'Owner dell'organizzazione)
   - Dalla gestione card fisiche: possibilità di collegare una card libera a una vCard esistente.
   - Una card può essere scollegata e riassegnata ad altra vCard (caso turnover).
3. **Gestione smarrimento/sostituzione**
   - Quando una card viene disattivata, il codice non risolve più a nessuna vCard attiva.
   - Chi scansiona la card vede una pagina che informa che la card non è attiva.
   - È possibile riattivare la card o collegare una nuova card alla stessa vCard.
4. **Filtri e ricerca**
   - Filtro per stato (tutte, libere, assegnate, disattivate).
   - Ricerca per codice o nome del dipendente associato.

### 8.7 Pagina pubblica vCard

- Ogni vCard è accessibile tramite URL nel formato `/{slug-organizzazione}/{slug-vcard}`.
- Anche raggiungibile tramite redirect dal codice card fisica: `/code/XXXX-XXXX` → pagina vCard.
- La pagina pubblica mostra:
  - intestazione con foto profilo, nome, ruolo, logo aziendale,
  - sfondo animato con effetto aurora (colori personalizzabili),
  - scheda "Contatti": cellulare, telefono ufficio, email, LinkedIn — ogni voce cliccabile e copiabile,
  - scheda "Azienda": telefono aziendale, email, sito, LinkedIn, indirizzo, ragione sociale, PEC, P.IVA, SDI, sede legale — ogni voce cliccabile e copiabile,
  - pulsante "Aggiungi contatto" per download file `.vcf`,
  - pulsante QR code che mostra un codice scannerizzabile.
- Deve essere responsive e funzionare bene su mobile.

---

## 9. Requisiti non funzionali

### 9.1 Architettura e sicurezza

- Multi-tenant con isolamento logico per organizzazione.
- Autorizzazioni basate su ruoli (RBAC) per Owner/Admin/Member.
- Codici card fisiche generati con set di caratteri non ambiguo, non predicibili.
- Protezione da enumerazione di URL (link vCard con slug sufficientemente lungo e casuale, o basato su nome).
- Log di sicurezza per accessi e operazioni critiche.

### 9.2 Performance e scalabilità

- Tempo di risposta pagina vCard pubblico < 500 ms in condizioni normali.
- Sistema progettato per scalare a migliaia di organizzazioni e decine di migliaia di vCard senza modifiche architetturali radicali.

### 9.3 Compliance e privacy

- Dati personali trattati in conformità GDPR (informativa privacy, DPA, diritto all'oblio, ecc.).
- Log delle modifiche critiche (chi ha cambiato cosa su vCard/card fisiche).
- Possibilità di disattivare rapidamente vCard e card fisiche in caso di richiesta di cancellazione.

### 9.4 Localizzazione

- MVP: interfaccia in italiano.
- Infrastruttura pronta per aggiungere altre lingue.
- Card pubbliche con possibilità di configurare lingua dei label (per future espansioni internazionali).

---

## 10. Metriche di successo (MVP)

- Numero di organizzazioni attive dopo X mesi.
- Tasso di attivazione vCard per organizzazione (vCard create / limite disponibile).
- Rapporto card fisiche generate / vCard attive.
- Percentuale di card fisiche in stato `assegnata` vs `libera`.
- Tempo medio per creare e assegnare una vCard a un nuovo dipendente (dall'invito alla prima condivisione).

---

## 11. Backlog funzionalità future

### 11.1 Analytics e dashboard

Molti strumenti concorrenti offrono analytics sulle visualizzazioni delle vCard, click sui link, dispositivi e browser usati. Una dashboard per organizzazione potrebbe includere:

- Visualizzazioni totali per vCard e per periodo.
- Click su specifici link (sito, LinkedIn, CTA).
- Ranking dei profili più visti.

> **Nota:** Il progetto di riferimento include un pacchetto analytics generico (dal framework base), ma non implementa tracking specifico sulle visualizzazioni delle vCard. Questa funzionalità andrebbe sviluppata da zero.

### 11.2 Lead capture e CRM-ready export

Le soluzioni più avanzate trasformano la vCard in un mini lead form, con campi personalizzabili e possibilità di push diretto verso CRM:

- Form contatto direttamente sulla vCard (nome, email, interesse, note).
- Esportazione CSV dei lead.
- Integrazioni native con CRM tramite API.

### 11.3 Integrazioni e servizi aggiuntivi

- Integrazione con Apple Wallet / Google Wallet per salvare la card come pass.
- Custom domain per organizzazione e white-label completo.
- Webhook o API per sincronizzare dati card e lead con sistemi terzi.

### 11.4 Funzioni di amministrazione avanzata

- Impersonation da Super Admin per debug e supporto.
- Email template personalizzabili per inviti, reset, notifiche.
- Monitoraggio health system (code job, errori, ecc.).
- Export CSV dei codici card fisiche per organizzazione (per produzione/encoding NFC).

---

## 12. Rischi e dipendenze

- Dipendenza da corretta produzione e encoding delle card NFC da parte del fornitore fisico.
- Rischio di abuso dei link vCard se non adeguatamente randomizzati o se i codici fossero indovinabili.
- Necessità di coordinare bene processi di onboarding contract-based tra team commerciali e Platform Admin per evitare ritardi nell'attivazione.
- Il progetto di riferimento è basato su uno starter kit (Makerkit Turbo) con funzionalità ereditate (billing, blog, changelog, documentazione) che andranno valutate: mantenere, adattare o rimuovere in base al modello B2B scelto.

---

## 13. Domande aperte / da definire

- Vuoi supportare più vCard per lo stesso utente (es. ruoli multipli, brand multipli) già in MVP o solo in fasi successive?
- Vuoi permettere all'organizzazione di avere più template vCard (es. per divisioni diverse) o uno solo in MVP?
- Quali campi devono essere obbligatori a livello di sistema e quali lasci completamente liberi per organizzazione?
- Vuoi prevedere già da subito export CSV dei contatti/lead raccolti dalle vCard, oltre ai codici delle card fisiche?
- Vuoi abilitare una modalità "private/protected" per alcune vCard (es. accesso con PIN o password)?
- Quali limiti tecnici immagini per i tier iniziali (es. Small, Medium, Large) in termini di vCard e card fisiche?
- Vuoi prevedere un ambiente di test/sandbox per organizzazioni pilota o partner (es. agenzie che rivendono il servizio)?
- Quali requisiti specifici in ottica GDPR (es. data retention, data residency) hai bisogno di soddisfare per il tuo mercato principale?
- Il sito marketing (blog, changelog, documentazione, pricing) va mantenuto o il prodotto viene proposto solo tramite canale commerciale diretto?
- Il sistema di notifiche in-app va incluso nell'MVP o è una funzionalità successiva?

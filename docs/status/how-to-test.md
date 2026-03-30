# Come testare la migrazione Supabase

## Prerequisiti

- Docker Desktop in esecuzione
- Node.js 20+
- Supabase CLI (`npx supabase --version` per verificare)

---

## 1. Avviare Supabase locale

```bash
npx supabase start
```

La prima volta scarica le immagini Docker (~500MB). Dopo il primo avvio e' istantaneo.

Output atteso: URL, chiavi, e porte per tutti i servizi.

### Chiavi importanti dall'output

Copia queste nel tuo file `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."  # dalla riga Publishable
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."                   # dalla riga Secret
```

### Applicare lo schema

```bash
npx supabase db reset
```

Questo ricrea il database da zero applicando la migration con tutte le tabelle, policy, funzioni e trigger.

---

## 2. Verificare il database

### Via Supabase Studio (GUI)

Apri http://127.0.0.1:54323 nel browser. Naviga a:
- **Table Editor**: verifica che ci siano 14 tabelle
- **Authentication**: verifica che il modulo auth sia attivo
- **Storage**: verifica che il bucket `images` esista

### Via CLI

```bash
# Verifica tabelle
npx supabase db query "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# Verifica RLS attivo
npx supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"

# Verifica funzioni
npx supabase db query "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';"
```

---

## 3. Avviare l'app Next.js

```bash
npm run dev
```

**Nota:** Ci sono attualmente ~111 errori TypeScript. L'app potrebbe non avviarsi completamente finche' non vengono risolti. Vedi `next-steps.md` per dettagli.

---

## 4. Test manuali per flusso auth

### 4.1 Registrazione
1. Vai a `http://localhost:3000/auth/sign-up`
2. Inserisci email e password
3. Controlla Mailpit (http://127.0.0.1:54324) per l'email di verifica
4. Clicca il link di verifica → dovrebbe reindirizzare a `/auth/confirm` e poi a `/dashboard`

### 4.2 Login
1. Vai a `http://localhost:3000/auth/sign-in`
2. Inserisci le credenziali create
3. Verifica redirect a `/dashboard`

### 4.3 Google OAuth (richiede configurazione)
1. Configura le credenziali Google in `.env`:
   ```
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```
2. In Google Cloud Console, aggiungi redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
3. Clicca "Sign in with Google" nella pagina di login

### 4.4 MFA (2FA)
1. Vai a Settings → Security
2. Abilita 2FA (TOTP)
3. Scansiona QR con Google Authenticator
4. Verifica che il login richieda il codice TOTP

### 4.5 Protezione route
1. In una finestra incognito, vai a `http://localhost:3000/dashboard`
2. Dovresti essere reindirizzato a `/auth/sign-in`

---

## 5. Test RLS (isolamento multi-tenant)

### Via Supabase Studio
1. Crea 2 utenti (via sign-up nell'app)
2. Crea 2 organizzazioni (una per utente)
3. Crea dei lead in ciascuna organizzazione
4. In Studio → SQL Editor, esegui:
   ```sql
   -- Come utente A, dovrebbe vedere solo i propri lead
   -- (simula settando il JWT dell'utente)
   SELECT * FROM lead;
   ```

### Via l'app
1. Login come Utente A → crea lead nell'Org A
2. Login come Utente B → crea lead nell'Org B
3. Verifica che Utente A non veda i lead di Org B e viceversa

---

## 6. Test Storage

1. Login e vai al profilo utente
2. Carica un avatar → dovrebbe uploadarsi su Supabase Storage
3. Verifica in Studio → Storage → bucket `images` che il file sia presente
4. Verifica che l'avatar venga visualizzato correttamente

---

## 7. Test Stripe Billing (richiede configurazione)

Il billing e' stato migrato ma non e' prioritario. Per testare:

1. Configura le chiavi Stripe in `.env`
2. Avvia il listener webhook:
   ```bash
   npm run stripe:listen
   ```
3. Crea un checkout → verifica che la subscription venga creata nel DB Supabase

---

## 8. Comandi utili

```bash
# Stato Supabase
npx supabase status

# Reset database (rigenera tutto da zero)
npx supabase db reset

# Rigenerare tipi TypeScript dopo modifiche schema
npx supabase gen types typescript --local > lib/supabase/database.types.ts

# Aprire Studio (GUI database)
npx supabase studio

# Vedere le email inviate (Mailpit)
# Apri http://127.0.0.1:54324

# Fermare Supabase
npx supabase stop

# TypeScript check
npx tsc --noEmit

# Linter
npm run lint
```

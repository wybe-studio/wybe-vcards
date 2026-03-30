# Feature Flags

Il progetto supporta feature flags via variabili `.env` per attivare/disattivare moduli in base alle necessita di ogni deploy. Ogni flag richiede un rebuild per avere effetto.

## Flag disponibili

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NEXT_PUBLIC_FEATURE_BILLING` | `true` | Sistema billing/Stripe, abbonamenti e crediti AI |
| `NEXT_PUBLIC_FEATURE_LEADS` | `true` | Modulo gestione lead |
| `NEXT_PUBLIC_FEATURE_AI_CHATBOT` | `true` | Modulo chatbot AI |
| `NEXT_PUBLIC_FEATURE_ONBOARDING` | `true` | Wizard di onboarding per nuovi utenti |
| `NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION` | `true` | Registrazione pubblica (off = solo admin crea utenti) |
| `NEXT_PUBLIC_FEATURE_MULTI_ORG` | `true` | Possibilita di creare piu organizzazioni |
| `NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY` | `false` | Ogni utente ha un'org personale invisibile, niente multi-org |
| `NEXT_PUBLIC_FEATURE_GOOGLE_AUTH` | `false` | Login e registrazione con Google OAuth |

## Configurazione

Aggiungi i flag al tuo `.env`:

```env
# Disabilita billing
NEXT_PUBLIC_FEATURE_BILLING=false

# Piattaforma interna senza registrazione pubblica
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION=false

# Solo account personali (niente organizzazioni visibili)
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY=true
```

Se un flag non e presente nel `.env`, viene usato il valore di default.

## Vincoli logici

- `PERSONAL_ACCOUNT_ONLY=true` forza automaticamente `MULTI_ORG=false` (con warning in console)
- `BILLING=false` blocca anche l'accesso ai crediti AI (dipendono da Stripe)
- `PUBLIC_REGISTRATION=false` richiede che un admin crei gli utenti dal pannello admin
- `GOOGLE_AUTH=true` richiede `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurati in Supabase

## Architettura: Guard a 3 livelli

Ogni feature disabilitata e protetta su 3 livelli per garantire sicurezza:

### 1. UI Layer — `FeatureGate` component

```tsx
import { FeatureGate } from "@/components/feature-gate";

<FeatureGate feature="billing">
  <BillingSection />
</FeatureGate>

// Mostra contenuto quando la feature e OFF
<FeatureGate feature="billing" invert>
  <p>Billing non disponibile</p>
</FeatureGate>
```

Il componente non renderizza i figli quando la feature e disabilitata. Usato nei menu sidebar, org switcher, e nelle pagine.

### 2. API Layer — `featureGuard` tRPC middleware

```typescript
import { featureGuard } from "@/trpc/init";

// Aggiungere dopo protectedOrganizationProcedure
list: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(listLeadsSchema)
  .query(async ({ ctx, input }) => { ... });
```

Ritorna `FORBIDDEN` con messaggio `Funzionalita "leads" non abilitata.` se la feature e off. Applicato a tutti i router delle feature disabilitabili.

### 3. Middleware Layer — `proxy.ts`

- `billing=false`: redirect da `/dashboard/choose-plan` e `/pricing` a `/dashboard`
- `publicRegistration=false`: redirect da `/auth/sign-up` a `/auth/sign-in` (tranne con `invitationId`)
- `onboarding=false`: skip del check `onboarding_complete`, utenti vanno direttamente al dashboard

## Copertura per feature

| Feature | Router tRPC protetti | UI nascosta | Middleware |
|---------|---------------------|-------------|------------|
| `billing` | `organization.subscription.*`, `organization.credit.*`, `admin.organization.adjustCredits/syncFromStripe/cancelSubscription` | Menu Abbonamento e Crediti, pricing page, choose-plan redirect | `/dashboard/choose-plan`, `/pricing` |
| `leads` | `organization.lead.*` | Menu Lead | — |
| `aiChatbot` | `organization.ai.*` | Menu Chatbot AI | — |
| `multiOrg` | `organization.create` | Bottone "Crea organizzazione" | — |
| `personalAccountOnly` | (usa guard multiOrg) | Org switcher semplificato, bottone creazione nascosto | — |
| `onboarding` | — | — | Skip onboarding redirect |
| `publicRegistration` | — | Pagina signup (derivata da `authConfig.enableSignup`) | `/auth/sign-up` redirect |
| `googleAuth` | — | Bottone "Accedi con Google" su login/signup (derivata da `authConfig.enableSocialLogin`) | — |

## Modalita Personal Account Only

Quando `PERSONAL_ACCOUNT_ONLY=true`:

- Alla registrazione (o creazione da admin), viene creata automaticamente un'organizzazione "personale" invisibile
- Il nome dell'org e il nome dell'utente (o prefisso email)
- L'org switcher mostra solo il nome utente, senza dropdown
- Il bottone "Crea organizzazione" e nascosto
- Sotto il cofano il modello dati resta basato su organizzazioni — cambia solo la UX

L'auto-creazione avviene in due punti:
- **Signup pubblico**: `app/(saas)/auth/confirm/route.ts` dopo verifica OTP
- **Creazione da admin**: procedura `admin.user.createUser`

## Admin Panel — Funzionalita aggiuntive

Queste procedure sono sempre disponibili (non condizionate da flag):

| Procedura | Input | Descrizione |
|-----------|-------|-------------|
| `admin.user.createUser` | email, password, nome, ruolo | Crea utente via Supabase Admin API |
| `admin.organization.createOrganization` | nome, ownerUserId | Crea org con proprietario |
| `admin.organization.addMember` | organizationId, userId, ruolo | Aggiunge membro a org |

Componenti modali corrispondenti:
- `components/admin/users/create-user-modal.tsx`
- `components/admin/organizations/create-organization-modal.tsx`
- `components/admin/organizations/add-member-modal.tsx`

## File chiave

| File | Ruolo |
|------|-------|
| `config/features.config.ts` | Config centralizzata, legge env, applica vincoli |
| `components/feature-gate.tsx` | Componente UI condizionale |
| `trpc/init.ts` | `featureGuard` middleware |
| `proxy.ts` | Redirect rotte disabilitate |
| `config/auth.config.ts` | `enableSignup` derivato dal flag |

## Aggiungere un nuovo feature flag

1. Aggiungi la variabile in `lib/env.ts` (sezioni `client` e `runtimeEnv`)
2. Aggiungi il campo in `config/features.config.ts` (oggetto `raw` e tipo `FeaturesConfig`)
3. Aggiungi `featureGuard("nomeFeature")` ai router tRPC interessati
4. Usa `<FeatureGate feature="nomeFeature">` per nascondere la UI
5. Se serve, aggiungi redirect in `proxy.ts`
6. Documenta il flag in questa pagina e in `.env.example`

## Scenari comuni

### Piattaforma interna (no registrazione, no billing)

```env
NEXT_PUBLIC_FEATURE_BILLING=false
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION=false
NEXT_PUBLIC_FEATURE_ONBOARDING=false
```

### App semplice con account personali

```env
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY=true
NEXT_PUBLIC_FEATURE_BILLING=false
NEXT_PUBLIC_FEATURE_LEADS=false
```

### SaaS completo (default)

Non serve nessun flag — tutti i default sono gia attivi.

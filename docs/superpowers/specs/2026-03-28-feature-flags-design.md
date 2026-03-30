# Feature Flags System Design

**Data**: 2026-03-28
**Stato**: Approvato

## Obiettivo

Rendere il progetto modulare tramite feature flags in variabili `.env`, permettendo di attivare/disattivare funzionalità e moduli in base alle necessita di ogni progetto/deploy.

## Decisioni chiave

- **Dove vivono i flag**: solo `.env` (NEXT_PUBLIC_), richiedono rebuild per cambiare
- **Tabelle DB**: restano sempre nello schema, mai usate quando feature off. Sicurezza a livello API/UI
- **Personal account only**: sotto il cofano resta basato su org (org "personale" invisibile creata automaticamente). Solo la UX cambia
- **Single organization**: soft limit — nasconde creazione org e blocca API, ma l'utente puo essere invitato in altre org
- **Admin panel**: le funzionalita di creazione utenti/org/assegnazione membri sono sempre disponibili, non condizionate da flag

## Feature Flags

| # | Variabile ENV | Default | Descrizione |
|---|---------------|---------|-------------|
| 1 | `NEXT_PUBLIC_FEATURE_BILLING` | `true` | Sistema billing/Stripe e crediti AI |
| 2 | `NEXT_PUBLIC_FEATURE_LEADS` | `true` | Modulo gestione lead |
| 3 | `NEXT_PUBLIC_FEATURE_AI_CHATBOT` | `true` | Modulo chatbot AI |
| 4 | `NEXT_PUBLIC_FEATURE_ONBOARDING` | `true` | Wizard di onboarding |
| 5 | `NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION` | `true` | Signup pubblico (off = solo admin crea utenti) |
| 6 | `NEXT_PUBLIC_FEATURE_MULTI_ORG` | `true` | Creazione multipla organizzazioni |
| 7 | `NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY` | `false` | Org invisibile, UI senza concetto di organizzazione |

### Vincoli logici

- `personalAccountOnly=true` forza `multiOrg=false` (con warning in console se contraddittorio)
- `publicRegistration=false` richiede admin panel funzionante (sempre attivo)
- `billing=false` disabilita anche i crediti AI (legati a Stripe)

## Architettura: Guard Layer a 3 livelli

### Livello 1: UI Layer

**Componente `FeatureGate`** (`components/feature-gate.tsx`):

```typescript
import { featuresConfig, type FeaturesConfig } from "@/config/features.config";

type Props = {
  feature: keyof FeaturesConfig;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  invert?: boolean;
};

export function FeatureGate({ feature, children, fallback, invert }: Props) {
  const enabled = invert ? !featuresConfig[feature] : featuresConfig[feature];
  return enabled ? children : (fallback ?? null);
}
```

Applicazione:
- **org menu items**: wrap Lead, Chatbot AI, Abbonamento, Crediti
- **org switcher**: nascondi "Crea organizzazione" se `multiOrg=false`; semplifica a solo nome utente se `personalAccountOnly=true`
- **org layout**: skip check `shouldRedirectToChoosePlan` se `billing=false`
- **pricing page**: `notFound()` se `billing=false`

### Livello 2: API Layer (tRPC)

**Middleware `featureGuard`** in `trpc/init.ts`:

```typescript
const featureGuard = (feature: keyof FeaturesConfig) =>
  t.middleware(({ next }) => {
    if (!featuresConfig[feature]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Funzionalita "${feature}" non abilitata.`,
      });
    }
    return next();
  });
```

Copertura:

| Feature | Router/Procedure protetti |
|---------|--------------------------|
| `billing` | `organization.subscription.*`, `organization.credit.*`, `admin.organization.adjustCredits` |
| `leads` | `organization.lead.*` |
| `aiChatbot` | `organization.ai.*` |
| `multiOrg` | `organization.create` |
| `personalAccountOnly` | Stesso guard di `multiOrg` su `organization.create` |
| `onboarding` | Nessun guard tRPC (gestito da middleware/UI) |
| `publicRegistration` | Nessun guard tRPC (Supabase Auth diretto) |

### Livello 3: Middleware Layer (proxy.ts)

Redirect delle rotte disabilitate:

- `billing=false`: redirect `/dashboard/choose-plan` e `/pricing` a `/dashboard`
- `publicRegistration=false`: redirect `/auth/sign-up` a `/auth/sign-in` (tranne se ha `invitationId`)
- `onboarding=false`: skip del check `onboarding_complete`, utenti vanno direttamente al dashboard

## Config centralizzata

### `config/features.config.ts`

```typescript
import { env } from "@/lib/env";

const bool = (val: string | undefined, fallback = true) =>
  val === undefined ? fallback : val === "true";

export const featuresConfig = {
  billing: bool(env.NEXT_PUBLIC_FEATURE_BILLING),
  leads: bool(env.NEXT_PUBLIC_FEATURE_LEADS),
  aiChatbot: bool(env.NEXT_PUBLIC_FEATURE_AI_CHATBOT),
  onboarding: bool(env.NEXT_PUBLIC_FEATURE_ONBOARDING),
  publicRegistration: bool(env.NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION),
  multiOrg: bool(env.NEXT_PUBLIC_FEATURE_MULTI_ORG),
  personalAccountOnly: bool(env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY, false),
} as const satisfies FeaturesConfig;

// Vincoli logici
if (featuresConfig.personalAccountOnly && featuresConfig.multiOrg) {
  console.warn("[features] personalAccountOnly=true forza multiOrg=false");
  (featuresConfig as Record<string, boolean>).multiOrg = false;
}

export type FeaturesConfig = {
  billing: boolean;
  leads: boolean;
  aiChatbot: boolean;
  onboarding: boolean;
  publicRegistration: boolean;
  multiOrg: boolean;
  personalAccountOnly: boolean;
};
```

### Integrazione con config esistenti

`authConfig.enableSignup` diventa derivato:

```typescript
// config/auth.config.ts
enableSignup: featuresConfig.publicRegistration,
```

## Estensione Admin Panel

Nuove funzionalita sempre disponibili (non condizionate da flag):

### Creazione utenti

- **Procedura**: `admin.user.createUser` (`protectedAdminProcedure`)
- **Input**: email, password, nome, ruolo piattaforma (user/admin)
- **Implementazione**: `adminClient.auth.admin.createUser` con `email_confirm: true`
- **UI**: `CreateUserModal` nella pagina admin utenti

### Creazione organizzazioni

- **Procedura**: `admin.organization.createOrganization` (`protectedAdminProcedure`)
- **Input**: nome organizzazione, userId dell'owner
- **Implementazione**: riusa RPC `create_organization_with_owner` via adminClient
- **UI**: `CreateOrganizationModal` nella pagina admin organizzazioni

### Assegnazione membri

- **Procedura**: `admin.organization.addMember` (`protectedAdminProcedure`)
- **Input**: organizationId, userId, ruolo (owner/admin/member)
- **Validazione**: utente e org esistono, utente non gia membro
- **UI**: bottone "Aggiungi membro" nel dettaglio org admin

### Sicurezza admin

- Tutte le procedure usano `protectedAdminProcedure`
- Creazione utente via Supabase Admin API (service_role key)
- Log di ogni operazione admin tramite `logger.info({ adminId, action }, "...")`

## Personal Account Only: Auto-setup

Quando `personalAccountOnly=true`, ogni nuovo utente riceve un'org "personale" automatica.

### Trigger di creazione

1. **Signup pubblico**: nel callback di conferma email (`auth/confirm/route.ts`), dopo `verifyOtp`
2. **Creazione da admin**: nella procedura `admin.user.createUser`, dopo creazione utente

### Comportamento

- **Nome org**: nome dell'utente (o email se nome non disponibile)
- **Slug**: derivato dal nome (es. `marco-rossi`)
- **Nessun flag speciale nel DB**: e una org normale, la distinzione e puramente UI
- **Auto-switch**: il dashboard layout cerca la prima org dell'utente e setta il cookie automaticamente

### Differenze UX

| Aspetto | Multi-org (default) | Personal account only |
|---------|--------------------|-----------------------|
| Creazione org | Manuale | Automatica al signup |
| Org switcher | Dropdown con lista | Solo nome utente, no dropdown |
| Label sidebar | "Organizzazione" | Nascosto o "Account" |
| Creazione altre org | Permessa | Bloccata (API + UI) |
| Inviti | Funzionano | Bloccati (implicito: `personalAccountOnly` forza `multiOrg=false`, che blocca la creazione org ma non gli inviti. Tuttavia in modalita personal-only non ha senso invitare membri nell'org personale, quindi il menu Membri viene nascosto via `FeatureGate`) |

## Matrice impatto

| Flag | Impatto | File stimati | Rischio |
|------|---------|-------------|---------|
| `personalAccountOnly` | Alto | ~15-20 | Medio-Alto |
| `billing` | Alto | ~12-15 | Medio |
| `publicRegistration` | Medio | ~5-8 | Medio |
| `multiOrg` | Basso | ~3-5 | Basso |
| `onboarding` | Basso | ~3-4 | Basso |
| `leads` | Basso | ~2-3 | Basso |
| `aiChatbot` | Basso | ~2-3 | Basso |

## Ordine di implementazione

Basato su dipendenze e rischio (semplici prima, complessi dopo):

1. **Config foundation** — `features.config.ts`, env validation, `FeatureGate` component, `featureGuard` middleware tRPC
2. **leads + aiChatbot** — piu semplici, validano il pattern
3. **onboarding** — semplice, solo proxy.ts
4. **billing** — tanti file ma pattern ripetitivo
5. **multiOrg** — semplice ma propedeutico a personalAccountOnly
6. **publicRegistration + estensione admin panel** — nuove funzionalita
7. **personalAccountOnly** — il piu complesso, dipende da multiOrg e admin panel

## Testing strategy

- **Unit test** per `features.config.ts`: parsing env, vincoli logici, default values
- **Unit test** per `featureGuard`: blocco con FORBIDDEN quando feature off
- **Integration test** per ogni flag: setta flag a false, verifica API risponde 403, UI nasconde elementi
- **E2E test** (Playwright): almeno uno scenario per `personalAccountOnly` e `publicRegistration=false`

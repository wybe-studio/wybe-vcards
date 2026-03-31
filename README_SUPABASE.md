# Supabase - Setup Multi-Ambiente

Il progetto usa due progetti Supabase separati per staging e produzione.

## Progetti

| Ambiente    | Project Ref                | Utilizzo                          |
| ----------- | -------------------------- | --------------------------------- |
| **Locale**  | -                          | `npm run db:start` (Docker)       |
| **Staging** | `bwgfqckcsxrgcdfdveuv`     | Preview deploy (Vercel)           |
| **Prod**    | `bidqxqljyvtnemhjxpbb`     | Production deploy (Vercel)        |

## Prerequisiti

```bash
# Login alla CLI di Supabase (una tantum)
npx supabase login
```

## Comandi

### Sviluppo locale

```bash
npm run db:start       # Avvia Supabase locale (Docker)
npm run db:stop        # Ferma Supabase locale
npm run db:reset       # Reset DB locale da migrations
npm run db:studio      # Apri Supabase Studio locale
npm run db:typegen     # Genera tipi TS dal DB locale
npm run db:migrate     # Crea nuova migration
```

### Deploy migrations su remoto

```bash
# 1. Linka al progetto desiderato
npm run db:link:staging    # Collega a staging
npm run db:link:prod       # Collega a produzione

# 2. Pusha le migrations
npm run db:push            # Applica migrations al progetto linkato

# 3. (Opzionale) Genera tipi dal remoto
npm run db:typegen:remote  # Genera tipi TS dal progetto linkato
```

## Workflow consigliato

```
1. Sviluppa in locale        →  npm run db:start / db:reset
2. Crea migration             →  npm run db:migrate nome_migration
3. Testa in locale            →  npm run db:reset
4. Deploy su staging          →  npm run db:link:staging && npm run db:push
5. Verifica su staging        →  testa il preview deploy su Vercel
6. Deploy in produzione       →  npm run db:link:prod && npm run db:push
```

## Variabili d'ambiente (Vercel)

Su **Vercel → Settings → Environment Variables**, configura per ogni ambiente:

| Variabile                              | Production        | Preview (staging) |
| -------------------------------------- | ----------------- | ----------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL progetto prod | URL progetto staging |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chiave prod       | Chiave staging    |
| `SUPABASE_SERVICE_ROLE_KEY`            | Chiave prod       | Chiave staging    |

Le chiavi si trovano su: **Supabase Dashboard → Project Settings → API**

## Note

- `supabase link` salva il riferimento in `.supabase/` (gia in `.gitignore`)
- `db:push` chiede la password del database la prima volta
- Le migrations locali sono in `supabase/migrations/`
- I warnings su `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` sono innocui se Google Auth non e attivo

# Estendere i dati dell'Organizzazione

Guida per aggiungere dati aggiuntivi alle organizzazioni (dati fiscali, indirizzi, preferenze, ecc.).

## Approccio consigliato: tabella separata 1:1

Creare una tabella `organization_details` collegata 1:1 con `organization`, invece di aggiungere colonne direttamente.

### Perché

- **Performance** — Le query comuni (lista org, switch, sidebar) restano leggere
- **Separazione** — I dati aggiuntivi sono un dominio a sé con regole proprie
- **RLS dedicata** — Accesso limitabile (es. solo owner/admin vedono i dati fiscali)
- **Join esplicito** — Si caricano solo quando servono (impostazioni, fatturazione)

### Schema di esempio (dati fiscali Italia)

```sql
create table public.organization_details (
  organization_id uuid primary key references public.organization(id) on delete cascade,
  -- Dati fiscali
  fiscal_code text,            -- Codice Fiscale
  vat_number text,             -- Partita IVA
  sdi_code text,               -- Codice SDI (fatturazione elettronica)
  pec text,                    -- PEC
  -- Indirizzo legale
  legal_address text,
  legal_city text,
  legal_province text,
  legal_postal_code text,
  legal_country text default 'IT',
  -- Indirizzo operativo (opzionale)
  operational_address text,
  operational_city text,
  operational_province text,
  operational_postal_code text,
  operational_country text,
  -- Meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_details enable row level security;
```

### RLS policies

```sql
-- Solo i membri dell'org possono leggere
create policy "members can read org details"
  on public.organization_details for select to authenticated
  using (has_org_role(organization_id, 'member'));

-- Solo owner/admin possono modificare
create policy "admins can update org details"
  on public.organization_details for update to authenticated
  using (has_org_role(organization_id, 'admin'));

-- Solo owner/admin possono inserire
create policy "admins can insert org details"
  on public.organization_details for insert to authenticated
  with check (has_org_role(organization_id, 'admin'));
```

### tRPC

```typescript
// trpc/routers/organization/management.ts

getDetails: protectedOrganizationProcedure.query(async ({ ctx }) => {
  const { data } = await ctx.supabase
    .from("organization_details")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .single();
  return data;
}),

updateDetails: protectedOrganizationProcedure
  .input(organizationDetailsSchema)
  .mutation(async ({ ctx, input }) => {
    // Verifica ruolo admin+
    if (ctx.membership.role === "member") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const { error } = await ctx.supabase
      .from("organization_details")
      .upsert({
        organization_id: ctx.organization.id,
        ...input,
      });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }),
```

### Schema Zod

```typescript
// schemas/organization-details.schema.ts
import { z } from "zod";

export const organizationDetailsSchema = z.object({
  fiscal_code: z.string().max(16).optional(),
  vat_number: z.string().max(11).optional(),
  sdi_code: z.string().max(7).optional(),
  pec: z.string().email().optional(),
  legal_address: z.string().max(255).optional(),
  legal_city: z.string().max(100).optional(),
  legal_province: z.string().max(2).optional(),
  legal_postal_code: z.string().max(5).optional(),
  legal_country: z.string().max(2).default("IT"),
  operational_address: z.string().max(255).optional(),
  operational_city: z.string().max(100).optional(),
  operational_province: z.string().max(2).optional(),
  operational_postal_code: z.string().max(5).optional(),
  operational_country: z.string().max(2).optional(),
});
```

## Quando usare JSONB invece

Se i campi variano molto tra deployment (es. kit usato in paesi diversi con dati fiscali diversi), una colonna `jsonb` con validazione Zod lato app può essere preferibile:

```sql
create table public.organization_details (
  organization_id uuid primary key references public.organization(id) on delete cascade,
  fiscal_data jsonb default '{}',
  addresses jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Pro: flessibile, nessuna migration per nuovi campi.
Contro: niente validazione DB, niente indici su singoli campi, tipi meno precisi.

**Consiglio**: per campi ben definiti (come quelli fiscali italiani), colonne esplicite sono meglio. Usa JSONB solo per dati realmente variabili.

## Checklist implementazione

- [ ] Creare migration con tabella e RLS
- [ ] Rigenerare tipi: `npm run db:typegen`
- [ ] Aggiungere schema Zod
- [ ] Aggiungere procedure tRPC (get/update)
- [ ] Creare form nella pagina impostazioni org
- [ ] (Opzionale) Trigger `updated_at` automatico

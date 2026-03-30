# Database Examples

Real examples from this project's schema (`supabase/migrations/00000000000000_initial_schema.sql`).

> **Nota**: Il modulo **Lead** è un'implementazione di riferimento inclusa nel kit come esempio concreto di feature CRUD org-scoped. Serve a mostrare i pattern per aggiungere nuove tabelle, RLS, router tRPC e UI. Non sarà presente in tutti i progetti derivati dal kit.

## Organization (Multi-Tenant Root)

```sql
create table public.organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  logo text,
  metadata text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_name_idx on public.organization(name);
create index organization_stripe_customer_id_idx on public.organization(stripe_customer_id);
alter table public.organization enable row level security;
```

## Member (Organization Membership)

```sql
create type public.member_role as enum ('owner', 'admin', 'member');

create table public.member (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create index member_organization_id_idx on public.member(organization_id);
create index member_user_id_idx on public.member(user_id);
alter table public.member enable row level security;
```

### Member RLS Policies

```sql
-- Members can see other members in their organizations
create policy "member_select" on public.member for select to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- Only org owner/admin can manage members
create policy "member_manage" on public.member for all to authenticated using (
  exists (
    select 1 from public.member m
    where m.organization_id = member.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
```

## Lead (Org-Scoped Feature)

```sql
create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'proposal',
  'negotiation', 'won', 'lost'
);

create type public.lead_source as enum (
  'website', 'referral', 'social_media', 'advertising',
  'cold_call', 'email', 'event', 'other'
);

create table public.lead (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  company text,
  job_title text,
  status public.lead_status not null default 'new',
  source public.lead_source not null default 'other',
  estimated_value integer,
  notes text,
  assigned_to_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lead_organization_id_idx on public.lead(organization_id);
create index lead_status_idx on public.lead(status);
alter table public.lead enable row level security;
```

### Lead RLS Policies

```sql
-- Org members can read leads
create policy "lead_select" on public.lead for select to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- Org members can insert leads
create policy "lead_insert" on public.lead for insert to authenticated with check (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- Org members can update leads
create policy "lead_update" on public.lead for update to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

-- Only owner/admin can delete leads
create policy "lead_delete" on public.lead for delete to authenticated using (
  exists (
    select 1 from public.member m
    where m.organization_id = lead.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
```

## Security Definer Function Example

When `.insert().select().single()` fails because RLS INSERT passes but SELECT doesn't yet (e.g., creating an org where the creator isn't a member yet):

```sql
create or replace function public.create_organization_with_owner(
  org_name text,
  org_slug text,
  owner_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
begin
  -- Validate caller is the owner
  if owner_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;

  insert into public.organization (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.member (organization_id, user_id, role)
  values (new_org_id, owner_user_id, 'owner');

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text, uuid) to authenticated;
```

## Enum Types Used

```sql
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
create type public.lead_source as enum ('website', 'referral', 'social_media', 'advertising', 'cold_call', 'email', 'event', 'other');
create type public.subscription_status as enum ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');
create type public.order_status as enum ('pending', 'completed', 'failed', 'refunded', 'partially_refunded');
create type public.billing_interval as enum ('day', 'week', 'month', 'year');
create type public.invitation_status as enum ('pending', 'accepted', 'rejected', 'canceled');
create type public.credit_transaction_type as enum ('purchase', 'subscription_grant', 'bonus', 'promo', 'usage', 'refund', 'expire', 'adjustment');
```

## Storage Bucket Policies

```sql
-- Images bucket (public read, owner write)
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

-- Upload: path must start with user's own ID folder
create policy "images_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read
create policy "images_select" on storage.objects for select to public
using (bucket_id = 'images');
```

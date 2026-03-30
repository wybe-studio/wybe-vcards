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

-- Indexes
create index organization_name_idx on public.organization(name);
create index organization_stripe_customer_id_idx on public.organization(stripe_customer_id);

-- RLS
alter table public.organization enable row level security;

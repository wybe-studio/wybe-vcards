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
  assigned_to_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index lead_organization_id_idx on public.lead(organization_id);
create index lead_status_idx on public.lead(status);
create index lead_source_idx on public.lead(source);
create index lead_assigned_to_id_idx on public.lead(assigned_to_id);
create index lead_email_idx on public.lead(email);
create index lead_created_at_idx on public.lead(created_at);
create index lead_org_status_idx on public.lead(organization_id, status);

-- RLS
alter table public.lead enable row level security;

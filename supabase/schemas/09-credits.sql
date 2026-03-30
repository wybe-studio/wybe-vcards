-- Credit Balance (one per organization)
create table public.credit_balance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organization(id) on delete cascade,
  balance integer not null default 0,
  lifetime_purchased integer not null default 0,
  lifetime_granted integer not null default 0,
  lifetime_used integer not null default 0,
  lifetime_expired integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index credit_balance_organization_id_idx on public.credit_balance(organization_id);

-- RLS
alter table public.credit_balance enable row level security;


-- Credit Transaction
create table public.credit_transaction (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  type public.credit_transaction_type not null,
  amount integer not null,
  balance_after integer not null,
  description text,
  reference_type text,
  reference_id text,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_by uuid references auth.users(id) on delete set null,
  metadata text,
  created_at timestamptz not null default now()
);

-- Indexes
create index credit_transaction_organization_id_idx on public.credit_transaction(organization_id);
create index credit_transaction_type_idx on public.credit_transaction(type);
create index credit_transaction_created_at_idx on public.credit_transaction(created_at);
create index credit_transaction_reference_idx on public.credit_transaction(reference_type, reference_id);
create index credit_transaction_org_created_idx on public.credit_transaction(organization_id, created_at);
create index credit_transaction_org_type_idx on public.credit_transaction(organization_id, type);

-- RLS
alter table public.credit_transaction enable row level security;


-- Credit Deduction Failure (audit log)
create table public.credit_deduction_failure (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  amount integer not null,
  error_code text not null,
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  reference_type text,
  reference_id text,
  user_id uuid references auth.users(id) on delete set null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index credit_deduction_failure_org_idx on public.credit_deduction_failure(organization_id);
create index credit_deduction_failure_resolved_idx on public.credit_deduction_failure(resolved);
create index credit_deduction_failure_created_idx on public.credit_deduction_failure(created_at);

-- RLS
alter table public.credit_deduction_failure enable row level security;

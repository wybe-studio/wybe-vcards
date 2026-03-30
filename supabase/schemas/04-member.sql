create table public.member (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, organization_id)
);

-- Indexes
create index member_organization_id_idx on public.member(organization_id);
create index member_user_id_idx on public.member(user_id);
create index member_role_idx on public.member(role);

-- RLS
alter table public.member enable row level security;

create table public.invitation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Indexes
create index invitation_organization_id_idx on public.invitation(organization_id);
create index invitation_email_idx on public.invitation(email);
create index invitation_status_idx on public.invitation(status);
create index invitation_expires_at_idx on public.invitation(expires_at);
create index invitation_inviter_id_idx on public.invitation(inviter_id);

-- RLS
alter table public.invitation enable row level security;

-- user_profile stores custom fields not in auth.users
-- Auto-created via trigger on auth.users insert (see 10-triggers.sql)
create table public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  onboarding_complete boolean not null default false,
  banned boolean not null default false,
  ban_reason text,
  ban_expires timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index user_profile_role_idx on public.user_profile(role);
create index user_profile_banned_idx on public.user_profile(banned);

-- RLS
alter table public.user_profile enable row level security;

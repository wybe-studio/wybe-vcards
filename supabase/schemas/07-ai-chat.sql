create table public.ai_chat (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  messages text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index ai_chat_organization_id_idx on public.ai_chat(organization_id);
create index ai_chat_user_id_idx on public.ai_chat(user_id);
create index ai_chat_created_at_idx on public.ai_chat(created_at);

-- RLS
alter table public.ai_chat enable row level security;

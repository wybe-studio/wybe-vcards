-- ============================================================
-- Enums
-- ============================================================

create type public.vcard_status as enum ('active', 'suspended', 'archived');
create type public.physical_card_status as enum ('free', 'assigned', 'disabled');

-- ============================================================
-- Organization limits (add columns to organization)
-- ============================================================

alter table public.organization
  add column max_vcards integer not null default 10,
  add column max_physical_cards integer not null default 20;

-- ============================================================
-- organization_profile (1:1 with organization)
-- ============================================================

create table public.organization_profile (
  organization_id uuid primary key references public.organization(id) on delete cascade,
  company_name text,
  vat_number text,
  fiscal_code text,
  ateco_code text,
  sdi_code text,
  iban text,
  bank_name text,
  pec text,
  phone text,
  email text,
  website text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  address text,
  legal_address text,
  admin_contact_name text,
  admin_contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_profile enable row level security;

create trigger set_updated_at before update on public.organization_profile
  for each row execute function trigger_set_updated_at();

-- ============================================================
-- organization_style (1:1 with organization)
-- ============================================================

create table public.organization_style (
  organization_id uuid primary key references public.organization(id) on delete cascade,
  aurora_color_primary text,
  aurora_color_secondary text,
  header_bg_color text,
  header_text_color text,
  button_bg_color text,
  button_text_color text,
  tab_bg_color text,
  slug_format text not null default 'readable',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_style enable row level security;

create trigger set_updated_at before update on public.organization_style
  for each row execute function trigger_set_updated_at();

-- ============================================================
-- vcard
-- ============================================================

create table public.vcard (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  slug text not null,
  job_title text,
  email text,
  phone text,
  phone_secondary text,
  linkedin_url text,
  profile_image text,
  status public.vcard_status not null default 'active',
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vcard_org_slug_unique unique (organization_id, slug)
);

create index vcard_organization_id_idx on public.vcard(organization_id);
create index vcard_status_idx on public.vcard(status);
create index vcard_user_id_idx on public.vcard(user_id);
create index vcard_created_at_idx on public.vcard(created_at);
create index vcard_org_status_idx on public.vcard(organization_id, status);

alter table public.vcard enable row level security;

create trigger set_updated_at before update on public.vcard
  for each row execute function trigger_set_updated_at();

-- ============================================================
-- physical_card
-- ============================================================

create table public.physical_card (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  code text not null unique,
  vcard_id uuid references public.vcard(id) on delete set null,
  status public.physical_card_status not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index physical_card_organization_id_idx on public.physical_card(organization_id);
create index physical_card_code_idx on public.physical_card(code);
create index physical_card_vcard_id_idx on public.physical_card(vcard_id);
create index physical_card_status_idx on public.physical_card(status);
create index physical_card_org_status_idx on public.physical_card(organization_id, status);

alter table public.physical_card enable row level security;

create trigger set_updated_at before update on public.physical_card
  for each row execute function trigger_set_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

-- organization_profile: all members read, admin+ write
create policy "Org members can read profile"
  on public.organization_profile for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

create policy "Org admins can update profile"
  on public.organization_profile for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

create policy "Platform admin can insert profile"
  on public.organization_profile for insert to authenticated
  with check (public.is_platform_admin());

-- organization_style: all members read, admin+ write
create policy "Org members can read style"
  on public.organization_style for select to authenticated
  using (public.is_organization_member(organization_id) or public.is_platform_admin());

create policy "Org admins can update style"
  on public.organization_style for update to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

create policy "Platform admin can insert style"
  on public.organization_style for insert to authenticated
  with check (public.is_platform_admin());

-- vcard: admin+ full CRUD, member reads/updates own only
create policy "Org admins have full access to vcards"
  on public.vcard for all to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

create policy "Members can read own vcard"
  on public.vcard for select to authenticated
  using (user_id = auth.uid());

create policy "Members can update own vcard"
  on public.vcard for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- vcard: anonymous read for public pages (active only)
create policy "Public can read active vcards"
  on public.vcard for select to anon
  using (status = 'active');

-- physical_card: admin+ of org only
create policy "Org admins have full access to physical cards"
  on public.physical_card for all to authenticated
  using (public.has_org_role(organization_id, 'admin') or public.is_platform_admin())
  with check (public.has_org_role(organization_id, 'admin') or public.is_platform_admin());

-- physical_card: anonymous read for code resolution
create policy "Public can read assigned physical cards"
  on public.physical_card for select to anon
  using (status = 'assigned');

-- organization_profile: anonymous read for public vcard pages
create policy "Public can read org profile"
  on public.organization_profile for select to anon
  using (true);

-- organization_style: anonymous read for public vcard pages
create policy "Public can read org style"
  on public.organization_style for select to anon
  using (true);

-- organization: anonymous read for public vcard slug resolution
create policy "Public can read org slug"
  on public.organization for select to anon
  using (true);

-- ============================================================
-- Auto-create org_profile and org_style on org creation
-- ============================================================

create or replace function public.auto_create_org_profile_and_style()
returns trigger as $$
begin
  insert into public.organization_profile (organization_id) values (new.id);
  insert into public.organization_style (organization_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_organization_created
  after insert on public.organization
  for each row execute function auto_create_org_profile_and_style();

-- ============================================================
-- Generate physical card code (non-ambiguous charset)
-- ============================================================

create or replace function public.generate_card_code()
returns text as $$
declare
  charset text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code text := '';
  i integer;
begin
  for i in 1..8 loop
    code := code || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
    if i = 4 then
      code := code || '-';
    end if;
  end loop;
  return code;
end;
$$ language plpgsql;

-- Batch generate physical cards for an organization
create or replace function public.generate_physical_cards_batch(
  p_organization_id uuid,
  p_count integer
) returns integer as $$
declare
  i integer;
  new_code text;
  generated integer := 0;
begin
  for i in 1..p_count loop
    -- Generate unique code with retry
    loop
      new_code := public.generate_card_code();
      begin
        insert into public.physical_card (organization_id, code, status)
        values (p_organization_id, new_code, 'free');
        generated := generated + 1;
        exit; -- success, exit retry loop
      exception when unique_violation then
        -- retry with new code
        null;
      end;
    end loop;
  end loop;
  return generated;
end;
$$ language plpgsql security definer;

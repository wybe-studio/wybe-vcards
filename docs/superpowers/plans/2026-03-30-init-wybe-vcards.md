# Wybe vCards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant vCard management platform with NFC physical cards, public vCard pages, and organization branding.

**Architecture:** Four new entities (vcard, physical_card, organization_profile, organization_style) following the existing Lead module CRUD pattern. Public vCard pages at `/{org-slug}/{vcard-slug}` with aurora effect. Physical card resolution at `/code/XXXX-XXXX`. Admin panel extended for batch card generation and org limits.

**Tech Stack:** Next.js 16 (App Router), tRPC v11, Supabase (PostgreSQL + RLS + Storage), Zod, React Hook Form, Tailwind CSS 4, Shadcn UI, nuqs, NiceModal.

**Spec:** `docs/superpowers/specs/2026-03-30-init-wybe-vcards-spec.md`

---

## File Structure

### Database

- Create: `supabase/migrations/YYYYMMDDHHMMSS_vcard_entities.sql` — All 4 tables, enums, RLS, triggers, indexes, auto-create trigger for org_profile and org_style
- Update: `supabase/schemas/01-enums.sql` — Add vcard_status, physical_card_status enums (reference only)
- Update: `lib/supabase/database.types.ts` — Regenerated via `npm run db:typegen`

### Enums

- Modify: `lib/enums.ts` — Add VcardStatus, PhysicalCardStatus

### Zod Schemas

- Create: `schemas/vcard-schemas.ts` — list, create, update, delete schemas
- Create: `schemas/physical-card-schemas.ts` — list, assign, unassign, disable schemas
- Create: `schemas/organization-profile-schemas.ts` — update schema
- Create: `schemas/organization-style-schemas.ts` — update schema
- Create: `schemas/admin-vcard-schemas.ts` — admin batch generate, admin org limits schemas

### tRPC Routers

- Create: `trpc/routers/organization/organization-vcard-router.ts` — CRUD for vcards
- Create: `trpc/routers/organization/organization-physical-card-router.ts` — List, assign, unassign, disable
- Create: `trpc/routers/organization/organization-profile-router.ts` — Get, update org profile
- Create: `trpc/routers/organization/organization-style-router.ts` — Get, update org style
- Modify: `trpc/routers/organization/index.ts` — Register new sub-routers
- Create: `trpc/routers/admin/admin-physical-card-router.ts` — Batch generate, list by org
- Modify: `trpc/routers/admin/index.ts` — Register physical card admin router

### Components — vCard Management

- Create: `components/organization/vcards-table.tsx` — DataTable with filters, search, actions
- Create: `components/organization/vcard-modal.tsx` — Sheet for create/edit vCard
- Create: `components/organization/vcard-status-badge.tsx` — Badge for active/suspended/archived

### Components — Physical Cards

- Create: `components/organization/physical-cards-table.tsx` — DataTable with filters, search
- Create: `components/organization/physical-card-assign-modal.tsx` — Sheet to assign card to vCard
- Create: `components/organization/physical-card-status-badge.tsx` — Badge for free/assigned/disabled

### Components — Org Settings Tabs

- Create: `components/organization/organization-profile-card.tsx` — Form for org profile data
- Create: `components/organization/organization-style-card.tsx` — Form with color pickers for branding
- Modify: `components/organization/organization-settings-tabs.tsx` — Add "Profilo aziendale" and "Stile" tabs

### Components — Admin Panel

- Create: `components/admin/organizations/org-limits-card.tsx` — Card to set max_vcards, max_physical_cards
- Create: `components/admin/organizations/generate-cards-modal.tsx` — Modal for batch generation
- Create: `components/admin/organizations/org-vcards-tab.tsx` — vCards list in admin org detail
- Create: `components/admin/organizations/org-physical-cards-tab.tsx` — Physical cards list in admin org detail

### Pages

- Create: `app/(saas)/dashboard/(sidebar)/organization/vcards/page.tsx` — vCard management page
- Create: `app/(saas)/dashboard/(sidebar)/organization/physical-cards/page.tsx` — Physical cards page
- Create: `app/(public)/[orgSlug]/[vcardSlug]/page.tsx` — Public vCard page
- Create: `app/(public)/code/[code]/route.ts` — Physical card code redirect

### Menu & Navigation

- Modify: `components/organization/organization-menu-items.tsx` — Add vCards and Physical Cards menu items
- Modify: `proxy.ts` — Add feature flag redirects for new routes (if needed)

### Public vCard Components

- Create: `components/public/vcard-page.tsx` — Main public vCard layout
- Create: `components/public/vcard-header.tsx` — Header with photo, name, role, logo
- Create: `components/public/vcard-aurora.tsx` — Aurora animated background
- Create: `components/public/vcard-contacts-tab.tsx` — Personal contacts tab
- Create: `components/public/vcard-company-tab.tsx` — Company data tab
- Create: `components/public/vcard-add-contact-button.tsx` — Download .vcf button
- Create: `components/public/vcard-qr-dialog.tsx` — QR code dialog
- Create: `lib/vcard/generate-vcf.ts` — Generate .vcf file content

### Config

- Modify: `config/app.config.ts` — Update appName to "Wybe vCards"
- Modify: `.env` / `.env.example` — Set feature flags (billing=false, leads=false, etc.)

---

## Task 1: Database Migration — Enums and Tables

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_vcard_entities.sql`

- [ ] **Step 1: Create the migration file**

Run: `npm run db:migrate`

Name: `vcard_entities`

- [ ] **Step 2: Write the migration SQL**

Add this content to the newly created migration file:

```sql
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
```

- [ ] **Step 3: Apply the migration**

Run: `npm run db:reset`
Expected: Database reset with new tables created successfully.

- [ ] **Step 4: Regenerate database types**

Run: `npm run db:typegen`
Expected: `lib/supabase/database.types.ts` updated with new table types.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ lib/supabase/database.types.ts
git commit -m "feat: add vcard, physical_card, org_profile, org_style tables with RLS"
```

---

## Task 2: Enums and Zod Schemas

**Files:**
- Modify: `lib/enums.ts`
- Create: `schemas/vcard-schemas.ts`
- Create: `schemas/physical-card-schemas.ts`
- Create: `schemas/organization-profile-schemas.ts`
- Create: `schemas/organization-style-schemas.ts`
- Create: `schemas/admin-vcard-schemas.ts`

- [ ] **Step 1: Add enums to `lib/enums.ts`**

Add after existing enums:

```typescript
// vCard status
export const VcardStatus = {
	active: "active",
	suspended: "suspended",
	archived: "archived",
} as const;
export type VcardStatus = Database["public"]["Enums"]["vcard_status"];

// Physical card status
export const PhysicalCardStatus = {
	free: "free",
	assigned: "assigned",
	disabled: "disabled",
} as const;
export type PhysicalCardStatus = Database["public"]["Enums"]["physical_card_status"];
```

- [ ] **Step 2: Create `schemas/vcard-schemas.ts`**

```typescript
import { z } from "zod";
import { VcardStatus } from "@/lib/enums";

const VcardSortField = z.enum([
	"first_name",
	"last_name",
	"email",
	"status",
	"created_at",
]);

export const listVcardsSchema = z.object({
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
	sortBy: VcardSortField.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	filters: z
		.object({
			status: z.array(z.nativeEnum(VcardStatus)).optional(),
		})
		.optional(),
});

export const createVcardSchema = z.object({
	firstName: z.string().trim().min(1, "Il nome e obbligatorio").max(100),
	lastName: z.string().trim().min(1, "Il cognome e obbligatorio").max(100),
	slug: z.string().trim().min(1).max(200).optional(),
	jobTitle: z.string().trim().max(200).optional(),
	email: z.string().trim().email("Email non valida").max(255).optional().or(z.literal("")),
	phone: z.string().trim().max(50).optional(),
	phoneSecondary: z.string().trim().max(50).optional(),
	linkedinUrl: z.string().trim().url("URL non valido").max(500).optional().or(z.literal("")),
	profileImage: z.string().trim().max(500).optional(),
	status: z.nativeEnum(VcardStatus).default("active"),
	userId: z.string().uuid().optional(),
});

export const updateVcardSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().trim().min(1).max(100).optional(),
	lastName: z.string().trim().min(1).max(100).optional(),
	slug: z.string().trim().min(1).max(200).optional(),
	jobTitle: z.string().trim().max(200).optional().nullable(),
	email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
	phone: z.string().trim().max(50).optional().nullable(),
	phoneSecondary: z.string().trim().max(50).optional().nullable(),
	linkedinUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
	profileImage: z.string().trim().max(500).optional().nullable(),
	status: z.nativeEnum(VcardStatus).optional(),
	userId: z.string().uuid().optional().nullable(),
});

export const deleteVcardSchema = z.object({
	id: z.string().uuid(),
});
```

- [ ] **Step 3: Create `schemas/physical-card-schemas.ts`**

```typescript
import { z } from "zod";
import { PhysicalCardStatus } from "@/lib/enums";

const PhysicalCardSortField = z.enum(["code", "status", "created_at"]);

export const listPhysicalCardsSchema = z.object({
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
	sortBy: PhysicalCardSortField.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	filters: z
		.object({
			status: z.array(z.nativeEnum(PhysicalCardStatus)).optional(),
		})
		.optional(),
});

export const assignPhysicalCardSchema = z.object({
	id: z.string().uuid(),
	vcardId: z.string().uuid(),
});

export const unassignPhysicalCardSchema = z.object({
	id: z.string().uuid(),
});

export const disablePhysicalCardSchema = z.object({
	id: z.string().uuid(),
});

export const enablePhysicalCardSchema = z.object({
	id: z.string().uuid(),
});
```

- [ ] **Step 4: Create `schemas/organization-profile-schemas.ts`**

```typescript
import { z } from "zod";

export const updateOrganizationProfileSchema = z.object({
	companyName: z.string().trim().max(200).optional().nullable(),
	vatNumber: z.string().trim().max(50).optional().nullable(),
	fiscalCode: z.string().trim().max(50).optional().nullable(),
	atecoCode: z.string().trim().max(20).optional().nullable(),
	sdiCode: z.string().trim().max(20).optional().nullable(),
	iban: z.string().trim().max(50).optional().nullable(),
	bankName: z.string().trim().max(200).optional().nullable(),
	pec: z.string().trim().email("PEC non valida").max(255).optional().nullable().or(z.literal("")),
	phone: z.string().trim().max(50).optional().nullable(),
	email: z.string().trim().email("Email non valida").max(255).optional().nullable().or(z.literal("")),
	website: z.string().trim().url("URL non valido").max(500).optional().nullable().or(z.literal("")),
	linkedinUrl: z.string().trim().url("URL non valido").max(500).optional().nullable().or(z.literal("")),
	facebookUrl: z.string().trim().url("URL non valido").max(500).optional().nullable().or(z.literal("")),
	instagramUrl: z.string().trim().url("URL non valido").max(500).optional().nullable().or(z.literal("")),
	address: z.string().trim().max(500).optional().nullable(),
	legalAddress: z.string().trim().max(500).optional().nullable(),
	adminContactName: z.string().trim().max(200).optional().nullable(),
	adminContactEmail: z.string().trim().email("Email non valida").max(255).optional().nullable().or(z.literal("")),
	notes: z.string().trim().max(2000).optional().nullable(),
});
```

- [ ] **Step 5: Create `schemas/organization-style-schemas.ts`**

```typescript
import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colore hex non valido").optional().nullable();

export const updateOrganizationStyleSchema = z.object({
	auroraColorPrimary: hexColor,
	auroraColorSecondary: hexColor,
	headerBgColor: hexColor,
	headerTextColor: hexColor,
	buttonBgColor: hexColor,
	buttonTextColor: hexColor,
	tabBgColor: hexColor,
	slugFormat: z.enum(["readable", "uuid"]).optional(),
});
```

- [ ] **Step 6: Create `schemas/admin-vcard-schemas.ts`**

```typescript
import { z } from "zod";

export const generatePhysicalCardsBatchSchema = z.object({
	organizationId: z.string().uuid(),
	count: z.number().min(1).max(500),
});

export const updateOrganizationLimitsSchema = z.object({
	organizationId: z.string().uuid(),
	maxVcards: z.number().min(1).max(10000),
	maxPhysicalCards: z.number().min(1).max(10000),
});

export const listOrgVcardsAdminSchema = z.object({
	organizationId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
});

export const listOrgPhysicalCardsAdminSchema = z.object({
	organizationId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
});
```

- [ ] **Step 7: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/enums.ts schemas/vcard-schemas.ts schemas/physical-card-schemas.ts schemas/organization-profile-schemas.ts schemas/organization-style-schemas.ts schemas/admin-vcard-schemas.ts
git commit -m "feat: add Zod schemas and enums for vcard entities"
```

---

## Task 3: tRPC Router — Organization Profile

**Files:**
- Create: `trpc/routers/organization/organization-profile-router.ts`
- Modify: `trpc/routers/organization/index.ts`

- [ ] **Step 1: Create `trpc/routers/organization/organization-profile-router.ts`**

```typescript
import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { updateOrganizationProfileSchema } from "@/schemas/organization-profile-schemas";
import {
	createTRPCRouter,
	protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationProfileRouter = createTRPCRouter({
	get: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("organization_profile")
			.select("*")
			.eq("organization_id", ctx.organization.id)
			.single();

		if (error) {
			logger.error({ error }, "Failed to fetch organization profile");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile caricare il profilo aziendale",
			});
		}

		return data;
	}),

	update: protectedOrganizationProcedure
		.input(updateOrganizationProfileSchema)
		.mutation(async ({ ctx, input }) => {
			if (
				ctx.membership.role !== "owner" &&
				ctx.membership.role !== "admin"
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono modificare il profilo aziendale",
				});
			}

			const { error } = await ctx.supabase
				.from("organization_profile")
				.update({
					company_name: input.companyName,
					vat_number: input.vatNumber,
					fiscal_code: input.fiscalCode,
					ateco_code: input.atecoCode,
					sdi_code: input.sdiCode,
					iban: input.iban,
					bank_name: input.bankName,
					pec: input.pec,
					phone: input.phone,
					email: input.email,
					website: input.website,
					linkedin_url: input.linkedinUrl,
					facebook_url: input.facebookUrl,
					instagram_url: input.instagramUrl,
					address: input.address,
					legal_address: input.legalAddress,
					admin_contact_name: input.adminContactName,
					admin_contact_email: input.adminContactEmail,
					notes: input.notes,
				})
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update organization profile");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare il profilo aziendale",
				});
			}

			return { success: true };
		}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/organization/index.ts`**

Add import:
```typescript
import { organizationProfileRouter } from "@/trpc/routers/organization/organization-profile-router";
```

Add to the `createTRPCRouter` call:
```typescript
profile: organizationProfileRouter,
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-profile-router.ts trpc/routers/organization/index.ts
git commit -m "feat: add organization profile tRPC router"
```

---

## Task 4: tRPC Router — Organization Style

**Files:**
- Create: `trpc/routers/organization/organization-style-router.ts`
- Modify: `trpc/routers/organization/index.ts`

- [ ] **Step 1: Create `trpc/routers/organization/organization-style-router.ts`**

```typescript
import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { updateOrganizationStyleSchema } from "@/schemas/organization-style-schemas";
import {
	createTRPCRouter,
	protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationStyleRouter = createTRPCRouter({
	get: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("organization_style")
			.select("*")
			.eq("organization_id", ctx.organization.id)
			.single();

		if (error) {
			logger.error({ error }, "Failed to fetch organization style");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile caricare lo stile",
			});
		}

		return data;
	}),

	update: protectedOrganizationProcedure
		.input(updateOrganizationStyleSchema)
		.mutation(async ({ ctx, input }) => {
			if (
				ctx.membership.role !== "owner" &&
				ctx.membership.role !== "admin"
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono modificare lo stile",
				});
			}

			const { error } = await ctx.supabase
				.from("organization_style")
				.update({
					aurora_color_primary: input.auroraColorPrimary,
					aurora_color_secondary: input.auroraColorSecondary,
					header_bg_color: input.headerBgColor,
					header_text_color: input.headerTextColor,
					button_bg_color: input.buttonBgColor,
					button_text_color: input.buttonTextColor,
					tab_bg_color: input.tabBgColor,
					slug_format: input.slugFormat,
				})
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update organization style");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare lo stile",
				});
			}

			return { success: true };
		}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/organization/index.ts`**

Add import:
```typescript
import { organizationStyleRouter } from "@/trpc/routers/organization/organization-style-router";
```

Add to the `createTRPCRouter` call:
```typescript
style: organizationStyleRouter,
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-style-router.ts trpc/routers/organization/index.ts
git commit -m "feat: add organization style tRPC router"
```

---

## Task 5: tRPC Router — vCard CRUD

**Files:**
- Create: `trpc/routers/organization/organization-vcard-router.ts`
- Modify: `trpc/routers/organization/index.ts`

- [ ] **Step 1: Create `trpc/routers/organization/organization-vcard-router.ts`**

```typescript
import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import {
	createVcardSchema,
	deleteVcardSchema,
	listVcardsSchema,
	updateVcardSchema,
} from "@/schemas/vcard-schemas";
import {
	createTRPCRouter,
	protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationVcardRouter = createTRPCRouter({
	list: protectedOrganizationProcedure
		.input(listVcardsSchema)
		.query(async ({ ctx, input }) => {
			const { limit, offset, query, sortBy, sortOrder, filters } = input;
			const orgId = ctx.organization.id;
			const isMember = ctx.membership.role === "member";

			let dbQuery = ctx.supabase
				.from("vcard")
				.select("*", { count: "exact" })
				.eq("organization_id", orgId);

			// Members see only their own vCard
			if (isMember) {
				dbQuery = dbQuery.eq("user_id", ctx.user.id);
			}

			// Text search
			if (query) {
				dbQuery = dbQuery.or(
					`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,job_title.ilike.%${query}%`,
				);
			}

			// Filters
			if (filters?.status && filters.status.length > 0) {
				dbQuery = dbQuery.in("status", filters.status);
			}

			// Sorting
			dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === "asc" });

			// Pagination
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list vcards");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le vCard",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	get: protectedOrganizationProcedure
		.input(deleteVcardSchema) // reuses { id: uuid }
		.query(async ({ ctx, input }) => {
			const { data, error } = await ctx.supabase
				.from("vcard")
				.select("*")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (error || !data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata",
				});
			}

			// Members can only see their own
			if (ctx.membership.role === "member" && data.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			return data;
		}),

	create: protectedOrganizationProcedure
		.input(createVcardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono creare vCard",
				});
			}

			const orgId = ctx.organization.id;

			// Check vCard limit
			const { count } = await ctx.supabase
				.from("vcard")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", orgId);

			const maxVcards = (ctx.organization as { max_vcards?: number }).max_vcards ?? 10;
			if ((count ?? 0) >= maxVcards) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limite di ${maxVcards} vCard raggiunto per questa organizzazione`,
				});
			}

			// Generate slug if not provided
			let slug = input.slug;
			if (!slug) {
				// Get org style for slug format preference
				const { data: style } = await ctx.supabase
					.from("organization_style")
					.select("slug_format")
					.eq("organization_id", orgId)
					.single();

				if (style?.slug_format === "uuid") {
					slug = nanoid(12);
				} else {
					const base = slugify(`${input.firstName} ${input.lastName}`, { lowercase: true, separator: "." });
					slug = base;

					// Check uniqueness within org
					const { data: existing } = await ctx.supabase
						.from("vcard")
						.select("id")
						.eq("organization_id", orgId)
						.eq("slug", slug)
						.maybeSingle();

					if (existing) {
						slug = `${base}-${nanoid(4)}`;
					}
				}
			}

			const { data, error } = await ctx.supabase
				.from("vcard")
				.insert({
					organization_id: orgId,
					first_name: input.firstName,
					last_name: input.lastName,
					slug,
					job_title: input.jobTitle ?? null,
					email: input.email || null,
					phone: input.phone ?? null,
					phone_secondary: input.phoneSecondary ?? null,
					linkedin_url: input.linkedinUrl || null,
					profile_image: input.profileImage ?? null,
					status: input.status,
					user_id: input.userId ?? null,
				})
				.select()
				.single();

			if (error) {
				logger.error({ error }, "Failed to create vcard");
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Esiste gia una vCard con questo slug nell'organizzazione",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare la vCard",
				});
			}

			return data;
		}),

	update: protectedOrganizationProcedure
		.input(updateVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updates } = input;

			// Check ownership for members
			if (ctx.membership.role === "member") {
				const { data: existing } = await ctx.supabase
					.from("vcard")
					.select("user_id")
					.eq("id", id)
					.eq("organization_id", ctx.organization.id)
					.single();

				if (!existing || existing.user_id !== ctx.user.id) {
					throw new TRPCError({ code: "FORBIDDEN" });
				}

				// Members cannot change status or user_id
				delete (updates as Record<string, unknown>).status;
				delete (updates as Record<string, unknown>).userId;
			}

			const updateData: Record<string, unknown> = {};
			if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
			if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
			if (updates.slug !== undefined) updateData.slug = updates.slug;
			if (updates.jobTitle !== undefined) updateData.job_title = updates.jobTitle;
			if (updates.email !== undefined) updateData.email = updates.email || null;
			if (updates.phone !== undefined) updateData.phone = updates.phone;
			if (updates.phoneSecondary !== undefined) updateData.phone_secondary = updates.phoneSecondary;
			if (updates.linkedinUrl !== undefined) updateData.linkedin_url = updates.linkedinUrl || null;
			if (updates.profileImage !== undefined) updateData.profile_image = updates.profileImage;
			if (updates.status !== undefined) updateData.status = updates.status;
			if (updates.userId !== undefined) updateData.user_id = updates.userId;

			const { error } = await ctx.supabase
				.from("vcard")
				.update(updateData)
				.eq("id", id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update vcard");
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Esiste gia una vCard con questo slug",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare la vCard",
				});
			}

			return { success: true };
		}),

	delete: protectedOrganizationProcedure
		.input(deleteVcardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono eliminare vCard",
				});
			}

			const { error } = await ctx.supabase
				.from("vcard")
				.delete()
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to delete vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile eliminare la vCard",
				});
			}

			return { success: true };
		}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/organization/index.ts`**

Add import:
```typescript
import { organizationVcardRouter } from "@/trpc/routers/organization/organization-vcard-router";
```

Add to the `createTRPCRouter` call:
```typescript
vcard: organizationVcardRouter,
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-vcard-router.ts trpc/routers/organization/index.ts
git commit -m "feat: add vCard CRUD tRPC router"
```

---

## Task 6: tRPC Router — Physical Cards (Org)

**Files:**
- Create: `trpc/routers/organization/organization-physical-card-router.ts`
- Modify: `trpc/routers/organization/index.ts`

- [ ] **Step 1: Create `trpc/routers/organization/organization-physical-card-router.ts`**

```typescript
import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import {
	assignPhysicalCardSchema,
	disablePhysicalCardSchema,
	enablePhysicalCardSchema,
	listPhysicalCardsSchema,
	unassignPhysicalCardSchema,
} from "@/schemas/physical-card-schemas";
import {
	createTRPCRouter,
	protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationPhysicalCardRouter = createTRPCRouter({
	list: protectedOrganizationProcedure
		.input(listPhysicalCardsSchema)
		.query(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { limit, offset, query, sortBy, sortOrder, filters } = input;

			let dbQuery = ctx.supabase
				.from("physical_card")
				.select("*, vcard:vcard(id, first_name, last_name, slug)", { count: "exact" })
				.eq("organization_id", ctx.organization.id);

			if (query) {
				dbQuery = dbQuery.or(`code.ilike.%${query}%`);
			}

			if (filters?.status && filters.status.length > 0) {
				dbQuery = dbQuery.in("status", filters.status);
			}

			dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === "asc" });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list physical cards");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le card fisiche",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	assign: protectedOrganizationProcedure
		.input(assignPhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			// Verify the card belongs to this org and is free
			const { data: card } = await ctx.supabase
				.from("physical_card")
				.select("id, status")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status === "assigned") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Card gia assegnata. Scollegala prima di riassegnarla." });
			}
			if (card.status === "disabled") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Card disattivata. Riattivala prima di assegnarla." });
			}

			// Verify the vcard belongs to this org
			const { data: vcard } = await ctx.supabase
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!vcard) {
				throw new TRPCError({ code: "NOT_FOUND", message: "vCard non trovata" });
			}

			// Check if vcard already has a card assigned
			const { data: existingCard } = await ctx.supabase
				.from("physical_card")
				.select("id")
				.eq("vcard_id", input.vcardId)
				.eq("status", "assigned")
				.maybeSingle();

			if (existingCard) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa vCard ha gia una card fisica assegnata. Scollega prima quella esistente.",
				});
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: input.vcardId, status: "assigned" })
				.eq("id", input.id);

			if (error) {
				logger.error({ error }, "Failed to assign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile assegnare la card",
				});
			}

			return { success: true };
		}),

	unassign: protectedOrganizationProcedure
		.input(unassignPhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to unassign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile scollegare la card",
				});
			}

			return { success: true };
		}),

	disable: protectedOrganizationProcedure
		.input(disablePhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: null, status: "disabled" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to disable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile disattivare la card",
				});
			}

			return { success: true };
		}),

	enable: protectedOrganizationProcedure
		.input(enablePhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ status: "free" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to enable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile riattivare la card",
				});
			}

			return { success: true };
		}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/organization/index.ts`**

Add import:
```typescript
import { organizationPhysicalCardRouter } from "@/trpc/routers/organization/organization-physical-card-router";
```

Add to the `createTRPCRouter` call:
```typescript
physicalCard: organizationPhysicalCardRouter,
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-physical-card-router.ts trpc/routers/organization/index.ts
git commit -m "feat: add physical card tRPC router"
```

---

## Task 7: tRPC Router — Admin Physical Cards & Org Limits

**Files:**
- Create: `trpc/routers/admin/admin-physical-card-router.ts`
- Modify: `trpc/routers/admin/index.ts`

- [ ] **Step 1: Create `trpc/routers/admin/admin-physical-card-router.ts`**

```typescript
import { TRPCError } from "@trpc/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
	generatePhysicalCardsBatchSchema,
	listOrgPhysicalCardsAdminSchema,
	listOrgVcardsAdminSchema,
	updateOrganizationLimitsSchema,
} from "@/schemas/admin-vcard-schemas";
import {
	createTRPCRouter,
	protectedAdminProcedure,
} from "@/trpc/init";

export const adminPhysicalCardRouter = createTRPCRouter({
	generateBatch: protectedAdminProcedure
		.input(generatePhysicalCardsBatchSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			// Check org limit
			const { data: org } = await adminClient
				.from("organization")
				.select("max_physical_cards")
				.eq("id", input.organizationId)
				.single();

			if (!org) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Organizzazione non trovata" });
			}

			const { count: currentCount } = await adminClient
				.from("physical_card")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", input.organizationId);

			const remaining = org.max_physical_cards - (currentCount ?? 0);
			if (input.count > remaining) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Puoi generare al massimo ${remaining} card fisiche (limite: ${org.max_physical_cards}, attuali: ${currentCount ?? 0})`,
				});
			}

			// Use the SQL function for atomic batch generation
			const { data, error } = await adminClient.rpc("generate_physical_cards_batch", {
				p_organization_id: input.organizationId,
				p_count: input.count,
			});

			if (error) {
				logger.error({ error }, "Failed to generate physical cards batch");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile generare le card fisiche",
				});
			}

			return { generated: data };
		}),

	updateLimits: protectedAdminProcedure
		.input(updateOrganizationLimitsSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			const { error } = await adminClient
				.from("organization")
				.update({
					max_vcards: input.maxVcards,
					max_physical_cards: input.maxPhysicalCards,
				})
				.eq("id", input.organizationId);

			if (error) {
				logger.error({ error }, "Failed to update organization limits");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare i limiti",
				});
			}

			return { success: true };
		}),

	listOrgVcards: protectedAdminProcedure
		.input(listOrgVcardsAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();
			const { limit, offset, query, organizationId } = input;

			let dbQuery = adminClient
				.from("vcard")
				.select("*", { count: "exact" })
				.eq("organization_id", organizationId);

			if (query) {
				dbQuery = dbQuery.or(
					`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`,
				);
			}

			dbQuery = dbQuery.order("created_at", { ascending: false });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list org vcards (admin)");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le vCard",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	listOrgPhysicalCards: protectedAdminProcedure
		.input(listOrgPhysicalCardsAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();
			const { limit, offset, query, organizationId } = input;

			let dbQuery = adminClient
				.from("physical_card")
				.select("*, vcard:vcard(id, first_name, last_name)", { count: "exact" })
				.eq("organization_id", organizationId);

			if (query) {
				dbQuery = dbQuery.or(`code.ilike.%${query}%`);
			}

			dbQuery = dbQuery.order("created_at", { ascending: false });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list org physical cards (admin)");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le card fisiche",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/admin/index.ts`**

```typescript
import { createTRPCRouter } from "@/trpc/init";
import { adminOrganizationRouter } from "@/trpc/routers/admin/admin-organization-router";
import { adminPhysicalCardRouter } from "@/trpc/routers/admin/admin-physical-card-router";
import { adminUserRouter } from "@/trpc/routers/admin/admin-user-router";

export const adminRouter = createTRPCRouter({
	organization: adminOrganizationRouter,
	physicalCard: adminPhysicalCardRouter,
	user: adminUserRouter,
});
```

- [ ] **Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/admin/admin-physical-card-router.ts trpc/routers/admin/index.ts
git commit -m "feat: add admin physical card router with batch generation and org limits"
```

---

## Task 8: Organization Settings Tabs — Profile & Style

**Files:**
- Create: `components/organization/organization-profile-card.tsx`
- Create: `components/organization/organization-style-card.tsx`
- Modify: `components/organization/organization-settings-tabs.tsx`

- [ ] **Step 1: Create `components/organization/organization-profile-card.tsx`**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/use-zod-form";
import { updateOrganizationProfileSchema } from "@/schemas/organization-profile-schemas";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OrganizationProfileCard(): React.JSX.Element {
	const utils = trpc.useUtils();
	const { data: profile, isPending: isLoading } =
		trpc.organization.profile.get.useQuery();

	const form = useZodForm({
		schema: updateOrganizationProfileSchema,
		values: profile
			? {
					companyName: profile.company_name,
					vatNumber: profile.vat_number,
					fiscalCode: profile.fiscal_code,
					atecoCode: profile.ateco_code,
					sdiCode: profile.sdi_code,
					iban: profile.iban,
					bankName: profile.bank_name,
					pec: profile.pec,
					phone: profile.phone,
					email: profile.email,
					website: profile.website,
					linkedinUrl: profile.linkedin_url,
					facebookUrl: profile.facebook_url,
					instagramUrl: profile.instagram_url,
					address: profile.address,
					legalAddress: profile.legal_address,
					adminContactName: profile.admin_contact_name,
					adminContactEmail: profile.admin_contact_email,
					notes: profile.notes,
				}
			: undefined,
	});

	const updateMutation = trpc.organization.profile.update.useMutation({
		onSuccess: () => {
			toast.success("Profilo aziendale aggiornato");
			utils.organization.profile.get.invalidate();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
				<Card>
					<CardHeader>
						<CardTitle>Profilo aziendale</CardTitle>
						<CardDescription>
							Questi dati vengono mostrati nella scheda "Azienda" di ogni vCard pubblica.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Identita legale</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="companyName" render={({ field }) => (
									<FormItem><FormLabel>Ragione sociale</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="vatNumber" render={({ field }) => (
									<FormItem><FormLabel>Partita IVA</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="fiscalCode" render={({ field }) => (
									<FormItem><FormLabel>Codice fiscale</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="atecoCode" render={({ field }) => (
									<FormItem><FormLabel>Codice ATECO</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="legalAddress" render={({ field }) => (
									<FormItem className="sm:col-span-2"><FormLabel>Sede legale</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Contatti operativi</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="phone" render={({ field }) => (
									<FormItem><FormLabel>Telefono</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="email" render={({ field }) => (
									<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="pec" render={({ field }) => (
									<FormItem><FormLabel>PEC</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="website" render={({ field }) => (
									<FormItem><FormLabel>Sito web</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="linkedinUrl" render={({ field }) => (
									<FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="facebookUrl" render={({ field }) => (
									<FormItem><FormLabel>Facebook</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="instagramUrl" render={({ field }) => (
									<FormItem><FormLabel>Instagram</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="address" render={({ field }) => (
									<FormItem><FormLabel>Indirizzo operativo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="adminContactName" render={({ field }) => (
									<FormItem><FormLabel>Contatto amministrativo</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="adminContactEmail" render={({ field }) => (
									<FormItem><FormLabel>Email contatto amm.</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Dati fatturazione</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="sdiCode" render={({ field }) => (
									<FormItem><FormLabel>Codice SDI</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="iban" render={({ field }) => (
									<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
								<FormField control={form.control} name="bankName" render={({ field }) => (
									<FormItem><FormLabel>Banca</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
								)} />
							</div>
						</div>

						<FormField control={form.control} name="notes" render={({ field }) => (
							<FormItem><FormLabel>Note interne</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
						)} />
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Salva
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}
```

- [ ] **Step 2: Create `components/organization/organization-style-card.tsx`**

```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useZodForm } from "@/hooks/use-zod-form";
import { updateOrganizationStyleSchema } from "@/schemas/organization-style-schemas";
import { trpc } from "@/trpc/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string | null | undefined;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center gap-3">
			<input
				type="color"
				value={value || "#000000"}
				onChange={(e) => onChange(e.target.value)}
				className="h-10 w-10 cursor-pointer rounded border"
			/>
			<div className="flex-1">
				<label className="text-sm font-medium">{label}</label>
				<Input
					value={value ?? ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder="#000000"
					className="mt-1"
				/>
			</div>
		</div>
	);
}

export function OrganizationStyleCard(): React.JSX.Element {
	const utils = trpc.useUtils();
	const { data: style, isPending: isLoading } =
		trpc.organization.style.get.useQuery();

	const form = useZodForm({
		schema: updateOrganizationStyleSchema,
		values: style
			? {
					auroraColorPrimary: style.aurora_color_primary,
					auroraColorSecondary: style.aurora_color_secondary,
					headerBgColor: style.header_bg_color,
					headerTextColor: style.header_text_color,
					buttonBgColor: style.button_bg_color,
					buttonTextColor: style.button_text_color,
					tabBgColor: style.tab_bg_color,
					slugFormat: style.slug_format as "readable" | "uuid",
				}
			: undefined,
	});

	const updateMutation = trpc.organization.style.update.useMutation({
		onSuccess: () => {
			toast.success("Stile aggiornato");
			utils.organization.style.get.invalidate();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
				<Card>
					<CardHeader>
						<CardTitle>Stile vCard</CardTitle>
						<CardDescription>
							Personalizza l'aspetto delle vCard pubbliche della tua organizzazione.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Effetto Aurora</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="auroraColorPrimary" render={({ field }) => (
									<FormItem>
										<ColorField label="Colore primario" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
								<FormField control={form.control} name="auroraColorSecondary" render={({ field }) => (
									<FormItem>
										<ColorField label="Colore secondario" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Intestazione</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="headerBgColor" render={({ field }) => (
									<FormItem>
										<ColorField label="Sfondo" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
								<FormField control={form.control} name="headerTextColor" render={({ field }) => (
									<FormItem>
										<ColorField label="Testo" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Bottone "Aggiungi contatto"</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField control={form.control} name="buttonBgColor" render={({ field }) => (
									<FormItem>
										<ColorField label="Sfondo" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
								<FormField control={form.control} name="buttonTextColor" render={({ field }) => (
									<FormItem>
										<ColorField label="Testo" value={field.value} onChange={field.onChange} />
										<FormMessage />
									</FormItem>
								)} />
							</div>
						</div>

						<FormField control={form.control} name="tabBgColor" render={({ field }) => (
							<FormItem>
								<ColorField label="Sfondo barra schede" value={field.value} onChange={field.onChange} />
								<FormMessage />
							</FormItem>
						)} />

						<FormField control={form.control} name="slugFormat" render={({ field }) => (
							<FormItem>
								<FormLabel>Formato URL vCard</FormLabel>
								<Select value={field.value ?? "readable"} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="readable">Leggibile (mario.rossi)</SelectItem>
										<SelectItem value="uuid">UUID (codice casuale)</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)} />
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Salva
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}
```

- [ ] **Step 3: Add tabs to `components/organization/organization-settings-tabs.tsx`**

Add the imports:
```typescript
import { OrganizationProfileCard } from "@/components/organization/organization-profile-card";
import { OrganizationStyleCard } from "@/components/organization/organization-style-card";
```

Add `"profile"` and `"style"` to the `tabValues` array.

Add the tab triggers (after "Generale", before "Membri"):
```tsx
{isAdmin && <UnderlinedTabsTrigger value="profile">Profilo aziendale</UnderlinedTabsTrigger>}
{isAdmin && <UnderlinedTabsTrigger value="style">Stile</UnderlinedTabsTrigger>}
```

Add the tab content panels:
```tsx
<UnderlinedTabsContent value="profile">
	<OrganizationProfileCard />
</UnderlinedTabsContent>
<UnderlinedTabsContent value="style">
	<OrganizationStyleCard />
</UnderlinedTabsContent>
```

- [ ] **Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add components/organization/organization-profile-card.tsx components/organization/organization-style-card.tsx components/organization/organization-settings-tabs.tsx
git commit -m "feat: add organization profile and style tabs in settings"
```

---

## Task 9: vCard Management Page & Components

**Files:**
- Create: `components/organization/vcard-status-badge.tsx`
- Create: `components/organization/vcard-modal.tsx`
- Create: `components/organization/vcards-table.tsx`
- Create: `app/(saas)/dashboard/(sidebar)/organization/vcards/page.tsx`
- Modify: `components/organization/organization-menu-items.tsx`

- [ ] **Step 1: Create `components/organization/vcard-status-badge.tsx`**

```typescript
import { Badge } from "@/components/ui/badge";
import type { VcardStatus } from "@/lib/enums";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	active: { label: "Attiva", variant: "default" },
	suspended: { label: "Sospesa", variant: "secondary" },
	archived: { label: "Archiviata", variant: "destructive" },
};

export function VcardStatusBadge({ status }: { status: VcardStatus }): React.JSX.Element {
	const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
	return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

- [ ] **Step 2: Create `components/organization/vcard-modal.tsx`**

Follow the exact same pattern as `components/organization/leads-modal.tsx`:
- NiceModal.create
- useEnhancedModal
- useZodForm with createVcardSchema / updateVcardSchema
- Sheet with form fields: firstName, lastName, jobTitle, email, phone, phoneSecondary, linkedinUrl, status (Select), userId (Select of org members)
- Create and update mutations with toast and invalidation of `organization.vcard.list`

- [ ] **Step 3: Create `components/organization/vcards-table.tsx`**

Follow the exact same pattern as `components/organization/leads-table.tsx`:
- useQueryState for search, pagination, filters
- tRPC query: `trpc.organization.vcard.list.useQuery`
- DataTable columns: selection, name (first+last), email, job_title, status (VcardStatusBadge), actions dropdown
- Actions: "Copia link" (copies `/{org-slug}/{vcard-slug}`), "Apri pubblica" (opens in new tab), "Modifica" (NiceModal.show VcardModal), "Elimina" (ConfirmationModal)
- Toolbar with "Aggiungi vCard" button
- Show license indicator: "X / Y vCard utilizzate"

- [ ] **Step 4: Create the page `app/(saas)/dashboard/(sidebar)/organization/vcards/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { VcardsTable } from "@/components/organization/vcards-table";
import {
	Page,
	PageBody,
	PageBreadcrumb,
	PageContent,
	PageHeader,
	PagePrimaryBar,
} from "@/components/ui/custom/page";
import { getOrganizationById, getSession } from "@/lib/auth/server";

export default async function VcardsPage() {
	const session = await getSession();
	if (!session?.session.activeOrganizationId) {
		redirect("/dashboard");
	}
	const organization = await getOrganizationById(
		session.session.activeOrganizationId,
	);
	if (!organization) {
		redirect("/dashboard");
	}

	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: organization.name, href: "/dashboard/organization" },
							{ label: "vCard" },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title="vCard">
					<VcardsTable />
				</PageContent>
			</PageBody>
		</Page>
	);
}
```

- [ ] **Step 5: Add menu items in `components/organization/organization-menu-items.tsx`**

Add to the "Applicazione" menu group items array:
```typescript
{ label: "vCard", href: `${basePath}/vcards`, icon: ContactIcon },
```

Import `ContactIcon` from `lucide-react` (or `IdCard` — pick the most appropriate icon).

- [ ] **Step 6: Verify the page renders**

Run: `npm run dev`
Navigate to `/dashboard/organization/vcards`
Expected: Table renders with "Aggiungi vCard" button, empty state.

- [ ] **Step 7: Commit**

```bash
git add components/organization/vcard-status-badge.tsx components/organization/vcard-modal.tsx components/organization/vcards-table.tsx app/(saas)/dashboard/(sidebar)/organization/vcards/ components/organization/organization-menu-items.tsx
git commit -m "feat: add vCard management page with table, modal, and menu item"
```

---

## Task 10: Physical Cards Management Page & Components

**Files:**
- Create: `components/organization/physical-card-status-badge.tsx`
- Create: `components/organization/physical-card-assign-modal.tsx`
- Create: `components/organization/physical-cards-table.tsx`
- Create: `app/(saas)/dashboard/(sidebar)/organization/physical-cards/page.tsx`
- Modify: `components/organization/organization-menu-items.tsx`

- [ ] **Step 1: Create `components/organization/physical-card-status-badge.tsx`**

```typescript
import { Badge } from "@/components/ui/badge";
import type { PhysicalCardStatus } from "@/lib/enums";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
	free: { label: "Libera", variant: "outline" },
	assigned: { label: "Assegnata", variant: "default" },
	disabled: { label: "Disattivata", variant: "destructive" },
};

export function PhysicalCardStatusBadge({ status }: { status: PhysicalCardStatus }): React.JSX.Element {
	const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
	return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

- [ ] **Step 2: Create `components/organization/physical-card-assign-modal.tsx`**

Sheet modal with:
- Select to choose a vCard from the org (query `organization.vcard.list` with status=active)
- Uses `organization.physicalCard.assign` mutation
- Shows the card code in the header

- [ ] **Step 3: Create `components/organization/physical-cards-table.tsx`**

Follow leads-table pattern:
- Columns: code, status (PhysicalCardStatusBadge), linked vCard name (if assigned), actions
- Filters: status (free/assigned/disabled)
- Search: by code
- Actions per row depending on status:
  - free: "Assegna" (opens assign modal)
  - assigned: "Scollega" (unassign mutation), "Disattiva" (disable mutation)
  - disabled: "Riattiva" (enable mutation)
- No "Crea" button (creation is admin-only)

- [ ] **Step 4: Create the page**

Same pattern as vcards page, at `app/(saas)/dashboard/(sidebar)/organization/physical-cards/page.tsx`

- [ ] **Step 5: Add menu item**

Add to the "Applicazione" group:
```typescript
{ label: "Card fisiche", href: `${basePath}/physical-cards`, icon: NfcIcon },
```

Import `NfcIcon` from `lucide-react`.

- [ ] **Step 6: Verify the page renders**

Run: `npm run dev`
Expected: Physical cards table renders, empty state since no cards generated yet.

- [ ] **Step 7: Commit**

```bash
git add components/organization/physical-card-status-badge.tsx components/organization/physical-card-assign-modal.tsx components/organization/physical-cards-table.tsx app/(saas)/dashboard/(sidebar)/organization/physical-cards/ components/organization/organization-menu-items.tsx
git commit -m "feat: add physical cards management page with table and assign modal"
```

---

## Task 11: Public vCard Page

**Files:**
- Create: `lib/vcard/generate-vcf.ts`
- Create: `components/public/vcard-aurora.tsx`
- Create: `components/public/vcard-header.tsx`
- Create: `components/public/vcard-contacts-tab.tsx`
- Create: `components/public/vcard-company-tab.tsx`
- Create: `components/public/vcard-add-contact-button.tsx`
- Create: `components/public/vcard-qr-dialog.tsx`
- Create: `components/public/vcard-page.tsx`
- Create: `app/(public)/[orgSlug]/[vcardSlug]/page.tsx`

- [ ] **Step 1: Create `lib/vcard/generate-vcf.ts`**

```typescript
interface VcfData {
	firstName: string;
	lastName: string;
	jobTitle?: string | null;
	email?: string | null;
	phone?: string | null;
	phoneSecondary?: string | null;
	linkedinUrl?: string | null;
	companyName?: string | null;
	companyPhone?: string | null;
	companyEmail?: string | null;
	companyWebsite?: string | null;
	companyAddress?: string | null;
	profileImageUrl?: string | null;
}

export function generateVcf(data: VcfData): string {
	const lines: string[] = [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`N:${data.lastName};${data.firstName};;;`,
		`FN:${data.firstName} ${data.lastName}`,
	];

	if (data.jobTitle) lines.push(`TITLE:${data.jobTitle}`);
	if (data.companyName) lines.push(`ORG:${data.companyName}`);
	if (data.email) lines.push(`EMAIL;TYPE=WORK:${data.email}`);
	if (data.phone) lines.push(`TEL;TYPE=CELL:${data.phone}`);
	if (data.phoneSecondary) lines.push(`TEL;TYPE=WORK:${data.phoneSecondary}`);
	if (data.companyPhone) lines.push(`TEL;TYPE=MAIN:${data.companyPhone}`);
	if (data.companyWebsite) lines.push(`URL:${data.companyWebsite}`);
	if (data.companyAddress) lines.push(`ADR;TYPE=WORK:;;${data.companyAddress};;;;`);
	if (data.linkedinUrl) lines.push(`URL;TYPE=LINKEDIN:${data.linkedinUrl}`);

	lines.push("END:VCARD");
	return lines.join("\r\n");
}
```

- [ ] **Step 2: Create public vCard components**

Create `components/public/vcard-aurora.tsx` — animated gradient background using CSS animations with the org's aurora colors (primary and secondary). Use `@keyframes` for smooth color transitions.

Create `components/public/vcard-header.tsx` — displays profile image, full name, job title, org logo. Uses header colors from org style.

Create `components/public/vcard-contacts-tab.tsx` — list of personal contact fields (phone, email, LinkedIn) with click-to-action and copy-to-clipboard buttons.

Create `components/public/vcard-company-tab.tsx` — list of company fields from organization_profile with click-to-action and copy-to-clipboard.

Create `components/public/vcard-add-contact-button.tsx` — button that generates and downloads the .vcf file using `generateVcf()`.

Create `components/public/vcard-qr-dialog.tsx` — dialog showing a QR code of the current URL. Use a QR code library (e.g., `qrcode.react`).

Create `components/public/vcard-page.tsx` — assembles all components with Tabs for "Contatti" / "Azienda".

- [ ] **Step 3: Create the page `app/(public)/[orgSlug]/[vcardSlug]/page.tsx`**

This is a server component that:
1. Creates an anonymous Supabase client (no auth needed — uses anon RLS policies)
2. Queries `organization` by slug
3. Queries `vcard` by org_id + slug, only active
4. Queries `organization_profile` and `organization_style` by org_id
5. If not found or not active: show "vCard non disponibile" page
6. Renders `VcardPage` with all fetched data as props

```typescript
import { createClient } from "@/lib/supabase/server";
import { VcardPage } from "@/components/public/vcard-page";
import { notFound } from "next/navigation";

export default async function PublicVcardPage({
	params,
}: {
	params: Promise<{ orgSlug: string; vcardSlug: string }>;
}) {
	const { orgSlug, vcardSlug } = await params;
	const supabase = await createClient();

	// Fetch org by slug
	const { data: org } = await supabase
		.from("organization")
		.select("id, name, slug, logo")
		.eq("slug", orgSlug)
		.single();

	if (!org) notFound();

	// Fetch vcard
	const { data: vcard } = await supabase
		.from("vcard")
		.select("*")
		.eq("organization_id", org.id)
		.eq("slug", vcardSlug)
		.eq("status", "active")
		.single();

	if (!vcard) notFound();

	// Fetch profile and style
	const [{ data: profile }, { data: style }] = await Promise.all([
		supabase.from("organization_profile").select("*").eq("organization_id", org.id).single(),
		supabase.from("organization_style").select("*").eq("organization_id", org.id).single(),
	]);

	return (
		<VcardPage
			vcard={vcard}
			organization={org}
			profile={profile}
			style={style}
		/>
	);
}
```

- [ ] **Step 4: Install QR code library**

Run: `npm install qrcode.react`

- [ ] **Step 5: Verify the public page renders**

Run: `npm run dev`
Create a test vCard via the management page, then navigate to `/{org-slug}/{vcard-slug}`
Expected: Public vCard page renders with contacts tab, company tab, aurora background.

- [ ] **Step 6: Commit**

```bash
git add lib/vcard/ components/public/ "app/(public)/" package.json package-lock.json
git commit -m "feat: add public vCard page with aurora effect, contacts, company tabs, vcf download, QR code"
```

---

## Task 12: Physical Card Code Redirect

**Files:**
- Create: `app/(public)/code/[code]/route.ts`

- [ ] **Step 1: Create the redirect route**

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ code: string }> },
) {
	const { code } = await params;
	const supabase = await createClient();

	// Look up the physical card by code
	const { data: card } = await supabase
		.from("physical_card")
		.select("status, vcard_id, vcard:vcard(slug, organization_id, status, organization:organization(slug))")
		.eq("code", code.toUpperCase())
		.single();

	// Card not found
	if (!card) {
		return NextResponse.json(
			{ error: "Card non trovata" },
			{ status: 404 },
		);
	}

	// Card disabled
	if (card.status === "disabled") {
		return NextResponse.json(
			{ error: "Questa card e stata disattivata" },
			{ status: 410 },
		);
	}

	// Card not assigned
	if (card.status === "free" || !card.vcard) {
		return NextResponse.json(
			{ error: "Questa card non e ancora associata a un profilo" },
			{ status: 404 },
		);
	}

	// vCard not active
	const vcard = card.vcard as { slug: string; status: string; organization: { slug: string } };
	if (vcard.status !== "active") {
		return NextResponse.json(
			{ error: "Il profilo associato non e attivo" },
			{ status: 410 },
		);
	}

	// Redirect to public vCard page
	const orgSlug = vcard.organization.slug;
	redirect(`/${orgSlug}/${vcard.slug}`);
}
```

- [ ] **Step 2: Test the redirect**

Run: `npm run dev`
Generate a batch of cards via admin, assign one to a vCard, then navigate to `/code/XXXX-XXXX`
Expected: Redirects to the public vCard page.

- [ ] **Step 3: Commit**

```bash
git add "app/(public)/code/"
git commit -m "feat: add physical card code redirect route"
```

---

## Task 13: Feature Flags & Config Updates

**Files:**
- Modify: `config/app.config.ts`
- Modify: `.env.example`
- Modify: `.env` (if exists)

- [ ] **Step 1: Update `config/app.config.ts`**

Change `appName` to `"Wybe vCards"`.

- [ ] **Step 2: Update `.env.example`**

Set the feature flags:
```env
NEXT_PUBLIC_FEATURE_BILLING=false
NEXT_PUBLIC_FEATURE_LEADS=false
NEXT_PUBLIC_FEATURE_AI_CHATBOT=false
NEXT_PUBLIC_FEATURE_ONBOARDING=true
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION=false
NEXT_PUBLIC_FEATURE_MULTI_ORG=false
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY=false
NEXT_PUBLIC_FEATURE_GOOGLE_AUTH=false
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add config/app.config.ts .env.example
git commit -m "feat: configure app name and feature flags for Wybe vCards"
```

---

## Task 14: Admin Panel — Org Limits & Card Generation UI

**Files:**
- Create: `components/admin/organizations/org-limits-card.tsx`
- Create: `components/admin/organizations/generate-cards-modal.tsx`

- [ ] **Step 1: Create `components/admin/organizations/org-limits-card.tsx`**

Card component with:
- Two number inputs: max_vcards, max_physical_cards
- Displays current usage: "X / Y vCard utilizzate", "X / Y card fisiche"
- Save button calling `admin.physicalCard.updateLimits`
- Uses useZodForm with updateOrganizationLimitsSchema

- [ ] **Step 2: Create `components/admin/organizations/generate-cards-modal.tsx`**

NiceModal with:
- Number input for quantity (1-500)
- Shows remaining capacity: "Puoi generare fino a X card"
- Calls `admin.physicalCard.generateBatch`
- On success: toast with number generated, invalidate queries

- [ ] **Step 3: Integrate into admin organization detail page**

Find the admin organization detail component and add:
- OrgLimitsCard in the organization detail view
- "Genera card fisiche" button that opens GenerateCardsModal

- [ ] **Step 4: Verify in the admin panel**

Run: `npm run dev`
Navigate to admin panel > Organizations > select one
Expected: See limits card and generate cards button.

- [ ] **Step 5: Commit**

```bash
git add components/admin/organizations/org-limits-card.tsx components/admin/organizations/generate-cards-modal.tsx
git commit -m "feat: add admin UI for org limits and batch card generation"
```

---

## Task 15: Cleanup — Remove Unused Modules

**Files:**
- Multiple files to remove or modify

- [ ] **Step 1: Identify files to remove**

Since `leads=false`, `aiChatbot=false`, `billing=false`, these modules are already disabled via feature flags. The code stays but is inactive. If you want to physically remove the code to reduce bundle size:

- `trpc/routers/organization/organization-lead-router.ts` — remove
- `trpc/routers/organization/organization-ai-router.ts` — remove
- `trpc/routers/organization/organization-credit-router.ts` — remove
- `trpc/routers/organization/organization-subscription-router.ts` — remove
- `components/organization/leads-table.tsx`, `leads-modal.tsx`, `leads-bulk-actions.tsx` — remove
- `components/ai/` — remove directory
- `components/billing/` — remove directory
- `schemas/organization-lead-schemas.ts` — remove
- `schemas/organization-credit-schemas.ts` — remove
- `schemas/organization-subscription-schemas.ts` — remove
- `app/(saas)/dashboard/(sidebar)/organization/leads/` — remove
- `app/(saas)/dashboard/(sidebar)/organization/chatbot/` — remove (if exists)
- Related imports in `trpc/routers/organization/index.ts`

**Note:** This is optional — feature flags already disable these modules. Defer if not needed now.

- [ ] **Step 2: Remove references from organization router**

In `trpc/routers/organization/index.ts`, remove the imports and registrations for lead, ai, credit, subscription routers.

- [ ] **Step 3: Remove references from menu items**

The menu items already use `featuresConfig.leads` and `featuresConfig.aiChatbot` conditionals, so they're already hidden. No changes needed unless physically removing.

- [ ] **Step 4: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove unused lead, billing, and AI modules"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Database migration (tables, enums, RLS, triggers, functions) | None |
| 2 | Enums and Zod schemas | Task 1 (db:typegen) |
| 3 | tRPC router — Organization profile | Task 2 |
| 4 | tRPC router — Organization style | Task 2 |
| 5 | tRPC router — vCard CRUD | Task 2 |
| 6 | tRPC router — Physical cards (org) | Task 2 |
| 7 | tRPC router — Admin physical cards & limits | Task 2 |
| 8 | Settings tabs — Profile & Style UI | Tasks 3, 4 |
| 9 | vCard management page & components | Task 5 |
| 10 | Physical cards management page | Task 6 |
| 11 | Public vCard page | Tasks 3, 4, 5 |
| 12 | Physical card code redirect | Task 11 |
| 13 | Feature flags & config | None (can run anytime) |
| 14 | Admin panel — limits & card generation | Task 7 |
| 15 | Cleanup — remove unused modules | After all above |

**Parallelizable:** Tasks 3-7 can run in parallel after Task 2. Tasks 8-10 can run in parallel. Task 13 is independent.

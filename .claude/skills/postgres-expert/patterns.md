# Database Patterns & Conventions

## Schema Location

All migrations are in `supabase/migrations/` with timestamp prefixes. The initial schema is in `00000000000000_initial_schema.sql`.

Reference schemas (not executed) may exist in `supabase/schemas/`.

## Multi-Tenant Pattern

Every org-scoped table MUST have:
- `organization_id uuid not null references public.organization(id) on delete cascade`
- An index on `organization_id`
- RLS policies that check membership via the `member` table

```sql
-- Standard org-scoped RLS: members can read
create policy "feature_select" on public.feature for select to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);
```

## Role-Based Access in RLS

### Helper functions

The project provides two DB functions for RLS policies — always prefer these over inline subqueries:

| Function | Usage |
|----------|-------|
| `has_org_role(org_id, required_role)` | Checks membership + role with inheritance: `member` includes all, `admin` includes owner, `owner` is exact |
| `is_platform_admin()` | Returns `true` if `user_profile.role = 'admin'` for `auth.uid()` |

### Pattern: all members read, admin+ write/delete

```sql
create policy "feature_select" on public.feature for select to authenticated
  using (has_org_role(organization_id, 'member'));

create policy "feature_insert" on public.feature for insert to authenticated
  with check (has_org_role(organization_id, 'member'));

create policy "feature_update" on public.feature for update to authenticated
  using (has_org_role(organization_id, 'admin'));

create policy "feature_delete" on public.feature for delete to authenticated
  using (has_org_role(organization_id, 'admin'));
```

### Pattern: ownership-based (admin sees all, member sees own)

Use when members should only access their own records but admin/owner can manage everything:

```sql
-- SELECT: admin+ sees all, member sees only own
create policy "feature_select" on public.feature for select to authenticated
  using (has_org_role(organization_id, 'admin') or user_id = auth.uid());

-- INSERT: any member, but only as themselves
create policy "feature_insert" on public.feature for insert to authenticated
  with check (has_org_role(organization_id, 'member') and user_id = auth.uid());

-- UPDATE: admin+ all, member only own
create policy "feature_update" on public.feature for update to authenticated
  using (has_org_role(organization_id, 'admin') or user_id = auth.uid());

-- DELETE: admin+ only
create policy "feature_delete" on public.feature for delete to authenticated
  using (has_org_role(organization_id, 'admin'));
```

This pattern requires a `user_id uuid not null references auth.users(id)` column on the table.

### Anti privilege-escalation

The `protect_user_profile_fields` trigger (BEFORE UPDATE on `user_profile`) silently reverts changes to `role`, `banned`, `ban_reason`, `ban_expires` if the caller is not a platform admin. This prevents self-promotion via direct PostgREST queries.

## Standard Table Template

```sql
create table public.feature (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  -- add feature-specific columns here
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on FK
create index feature_organization_id_idx on public.feature(organization_id);

-- Enable RLS
alter table public.feature enable row level security;

-- RLS policies
create policy "feature_select" on public.feature for select to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

create policy "feature_insert" on public.feature for insert to authenticated with check (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

create policy "feature_update" on public.feature for update to authenticated using (
  organization_id in (
    select m.organization_id from public.member m where m.user_id = auth.uid()
  )
);

create policy "feature_delete" on public.feature for delete to authenticated using (
  exists (
    select 1 from public.member m
    where m.organization_id = feature.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);
```

## Security Definer Functions

Use when `.insert().select().single()` fails because INSERT RLS passes but SELECT RLS doesn't yet (e.g., org creator isn't a member yet):

```sql
create or replace function public.my_function(param1 text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- ALWAYS validate permissions first
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  -- Perform operation
  -- ...
end;
$$;

grant execute on function public.my_function(text) to authenticated;
```

## Column Naming

- All columns use **snake_case**: `organization_id`, `created_at`, `first_name`
- UUIDs via `gen_random_uuid()` (not `extensions.uuid_generate_v4()`)
- Timestamps use `timestamptz` shorthand (not `timestamp with time zone`)
- Boolean defaults: `not null default false`

## Enum Conventions

```sql
-- Create enum type
create type public.feature_status as enum ('draft', 'active', 'archived');

-- Use in table
status public.feature_status not null default 'draft'
```

In TypeScript (via `lib/enums.ts`), enums are PascalCase:
```typescript
enum FeatureStatus { draft = "draft", active = "active", archived = "archived" }
```

## Migration Workflow

```bash
# Create a new migration
npm run db:migrate    # prompts for migration name

# Reset DB from all migrations
npm run db:reset

# Regenerate TypeScript types after schema changes
npm run db:typegen

# Open Supabase Studio GUI
npm run db:studio
```

## PostgREST / Supabase Client Gotchas

1. **`.insert().select().single()`** requires BOTH INSERT and SELECT RLS policies
2. **FK joins** must match actual FK relationships — check with `list_tables verbose`
3. **`user_profile`** only has: id, username, role, onboarding_complete, banned, ban_reason, ban_expires, created_at, updated_at. Name/email/image are in `auth.users.raw_user_meta_data`
4. **snake_case everywhere** in DB queries — never camelCase column names

## Storage Path Convention

Upload paths: `{userId}/{uuid}.png` — first folder segment MUST be the user's ID (RLS enforces via `storage.foldername(name)[1] = auth.uid()::text`).

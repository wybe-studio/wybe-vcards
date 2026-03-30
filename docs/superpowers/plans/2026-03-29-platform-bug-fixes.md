# Platform Bug Fixes & Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all bugs and localization issues from the platform test report dated 2026-03-29.

**Architecture:** Direct file edits across UI components, one tRPC query fix with a new RPC function for member data enrichment, and blog content translation. No new dependencies needed.

**Tech Stack:** Next.js, React, TypeScript, Supabase (PostgreSQL RPC), tRPC

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/organization/delete-organization-card.tsx` | Modify | BUG-001: Fix unicode escapes |
| `supabase/migrations/YYYYMMDD_get_org_members_with_user.sql` | Create | BUG-002: RPC function for member data |
| `trpc/routers/organization/index.ts` | Modify | BUG-002: Enrich members with user metadata |
| `types/organization.ts` | Verify | BUG-002: Type already correct, no change needed |
| `components/admin/admin-menu-items.tsx` | Modify | BUG-003: Translate labels to Italian |
| `components/crop-image-modal.tsx` | Modify | BUG-004: Add dialog title + description |
| `components/billing/current-plan-card.tsx` | Modify | LOC-001: Fix accents |
| `components/billing/subscription-settings-tab.tsx` | Modify | LOC-001: Fix accents |
| `components/billing/purchase-credits-modal.tsx` | Modify | LOC-001: Fix accents |
| `components/admin/app-config/app-config-table.tsx` | Modify | LOC-001: Fix accents |
| `components/admin/organizations/adjust-credits-modal.tsx` | Modify | LOC-001: Fix accents |
| `components/admin/users/users-table.tsx` | Modify | LOC-001: Fix accents |
| `components/admin/organizations/organizations-table.tsx` | Modify | LOC-001: Fix accents |
| `components/marketing/sections/hero-section.tsx` | Modify | LOC-003: Replace "Better Auth" |
| `components/marketing/sections/features-section.tsx` | Modify | LOC-003: Replace "Better Auth" |
| `content/posts/vibe-coding.mdx` | Modify | LOC-002: Translate to Italian |
| `content/posts/mastering-saas-billing.mdx` | Modify | LOC-002: Translate to Italian |
| `content/posts/building-ai-apps.mdx` | Modify | LOC-002: Translate to Italian |

---

## Task 1: BUG-001 — Fix Unicode Escapes in Delete Organization Card

**Files:**
- Modify: `components/organization/delete-organization-card.tsx`

- [ ] **Step 1: Replace unicode escapes with actual characters**

In `components/organization/delete-organization-card.tsx`, make these 3 replacements:

Line 33 — replace:
```tsx
message: `Sei sicuro di voler eliminare l'organizzazione "${organization.name}"? Questa azione non pu\u00F2 essere annullata e tutti i dati verranno eliminati definitivamente.`,
```
with:
```tsx
message: `Sei sicuro di voler eliminare l'organizzazione "${organization.name}"? Questa azione non può essere annullata e tutti i dati verranno eliminati definitivamente.`,
```

Line 42 — replace:
```tsx
toast.success("La tua organizzazione \u00E8 stata eliminata.");
```
with:
```tsx
toast.success("La tua organizzazione è stata eliminata.");
```

Line 62 — replace:
```tsx
Questa azione non pu\u00F2 essere annullata. Tutti i dati
```
with:
```tsx
Questa azione non può essere annullata. Tutti i dati
```

- [ ] **Step 2: Verify the file renders correctly**

Run: `npm run typecheck`
Expected: No errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add components/organization/delete-organization-card.tsx
git commit -m "fix: replace unicode escapes with actual accented characters in delete org card (BUG-001)"
```

---

## Task 2: BUG-002 — Fix Missing Member Name/Email/Avatar in Members Table

**Files:**
- Create: `supabase/migrations/YYYYMMDD_get_organization_members.sql` (use actual timestamp)
- Modify: `trpc/routers/organization/index.ts:104-125`

**Root cause:** The query `member(*)` fetches only the `member` table columns (`id, user_id, role, organization_id, created_at, updated_at`). It does NOT join with `auth.users` because PostgREST cannot join across schemas via the JS client. The `user` property expected by the frontend component (`row.original.user.name`, `row.original.user.email`, `row.original.user.image`) is never populated.

**Solution:** Create a SECURITY DEFINER RPC function that fetches members with their `auth.users` metadata, then call it from the tRPC router to enrich the data.

- [ ] **Step 1: Create the migration with an RPC function**

Create migration file (use `npm run db:migrate` or create manually with timestamp):

```sql
-- Get organization members with user metadata from auth.users
create or replace function public.get_organization_members(p_organization_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role text,
  organization_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_name text,
  user_email text,
  user_image text
)
language sql
security definer
set search_path = ''
as $$
  select
    m.id,
    m.user_id,
    m.role::text,
    m.organization_id,
    m.created_at,
    m.updated_at,
    coalesce(u.raw_user_meta_data->>'name', '') as user_name,
    coalesce(u.email, '') as user_email,
    u.raw_user_meta_data->>'image' as user_image
  from public.member m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id;
$$;

-- Grant execute to authenticated users (RLS on member table still applies within the function context)
grant execute on function public.get_organization_members(uuid) to authenticated;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npm run db:reset` or apply via Supabase MCP.
Expected: Migration applies without errors.

- [ ] **Step 3: Regenerate database types**

Run: `npm run db:typegen`
Expected: `lib/supabase/database.types.ts` updated with the new function signature.

- [ ] **Step 4: Modify the organization.get tRPC query to enrich members**

In `trpc/routers/organization/index.ts`, modify the `get` procedure (lines 104-125):

Replace:
```typescript
get: protectedProcedure
    .input(getOrganizationByIdSchema)
    .query(async ({ ctx, input }) => {
        // Verify user is a member of this organization (throws if not)
        await assertUserIsOrgMember(input.id, ctx.user.id);

        // Fetch org with members and invitations
        const { data: organization, error } = await ctx.supabase
            .from("organization")
            .select("*, members:member(*), invitations:invitation(*)")
            .eq("id", input.id)
            .single();

        if (error || !organization) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Organizzazione non trovata",
            });
        }

        return organization;
    }),
```

With:
```typescript
get: protectedProcedure
    .input(getOrganizationByIdSchema)
    .query(async ({ ctx, input }) => {
        // Verify user is a member of this organization (throws if not)
        await assertUserIsOrgMember(input.id, ctx.user.id);

        // Fetch org with invitations
        const { data: organization, error } = await ctx.supabase
            .from("organization")
            .select("*, invitations:invitation(*)")
            .eq("id", input.id)
            .single();

        if (error || !organization) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Organizzazione non trovata",
            });
        }

        // Fetch members with user metadata via RPC
        const { data: membersData } = await ctx.supabase.rpc(
            "get_organization_members",
            { p_organization_id: input.id },
        );

        const members = (membersData ?? []).map((m) => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role as "owner" | "admin" | "member",
            organization_id: m.organization_id,
            created_at: m.created_at,
            updated_at: m.updated_at,
            user: {
                id: m.user_id,
                name: m.user_name,
                email: m.user_email,
                image: m.user_image,
            },
        }));

        return { ...organization, members };
    }),
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 6: Verify in browser**

Navigate to `/dashboard/organization/settings?tab=members`.
Expected: Member rows now show avatar, name, and email.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_get_organization_members.sql trpc/routers/organization/index.ts
git commit -m "fix: enrich member data with user metadata via RPC function (BUG-002)"
```

---

## Task 3: BUG-003 — Translate Admin Sidebar Labels to Italian

**Files:**
- Modify: `components/admin/admin-menu-items.tsx:37-68`

- [ ] **Step 1: Replace English labels with Italian**

In `components/admin/admin-menu-items.tsx`, replace the `menuGroups` array:

```typescript
const menuGroups: MenuGroup[] = [
    {
        label: "Management",
        items: [
            {
                label: "Users",
                href: "/dashboard/admin/users",
                icon: UsersIcon,
            },
            {
                label: "Organizations",
                href: "/dashboard/admin/organizations",
                icon: Building2Icon,
            },
            {
                label: "Subscriptions",
                href: "/dashboard/admin/subscriptions",
                icon: CreditCardIcon,
            },
            {
                label: "Credits",
                href: "/dashboard/admin/credits",
                icon: CoinsIcon,
            },
            {
                label: "App Config",
                href: "/dashboard/admin/app-config",
                icon: FileCog2Icon,
            },
        ],
    },
];
```

With:
```typescript
const menuGroups: MenuGroup[] = [
    {
        label: "Gestione",
        items: [
            {
                label: "Utenti",
                href: "/dashboard/admin/users",
                icon: UsersIcon,
            },
            {
                label: "Organizzazioni",
                href: "/dashboard/admin/organizations",
                icon: Building2Icon,
            },
            {
                label: "Abbonamenti",
                href: "/dashboard/admin/subscriptions",
                icon: CreditCardIcon,
            },
            {
                label: "Crediti",
                href: "/dashboard/admin/credits",
                icon: CoinsIcon,
            },
            {
                label: "Configurazione",
                href: "/dashboard/admin/app-config",
                icon: FileCog2Icon,
            },
        ],
    },
];
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-menu-items.tsx
git commit -m "fix: translate admin sidebar labels to Italian (BUG-003)"
```

---

## Task 4: BUG-004 — Add Title and Description to Crop Image Dialog

**Files:**
- Modify: `components/crop-image-modal.tsx:63-65`

- [ ] **Step 1: Add title and description to DialogHeader**

In `components/crop-image-modal.tsx`, replace:
```tsx
<DialogHeader>
    <DialogTitle />
</DialogHeader>
```

With:
```tsx
<DialogHeader>
    <DialogTitle>Ritaglia immagine</DialogTitle>
    <DialogDescription>
        Trascina per riposizionare e ridimensionare l'area di ritaglio.
    </DialogDescription>
</DialogHeader>
```

Also add `DialogDescription` to the imports from `@/components/ui/dialog` at the top of the file (find the existing import line and add `DialogDescription` to it).

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No errors. Console warning about missing description should be gone.

- [ ] **Step 3: Commit**

```bash
git add components/crop-image-modal.tsx
git commit -m "fix: add title and description to crop image dialog for accessibility (BUG-004)"
```

---

## Task 5: LOC-001 — Fix Missing Italian Accents Across Multiple Files

**Files:**
- Modify: `components/billing/current-plan-card.tsx` (3 occurrences of "funzionalita")
- Modify: `components/billing/subscription-settings-tab.tsx` (2x "funzionalita", 1x "piu")
- Modify: `components/billing/purchase-credits-modal.tsx` (1x "piu")
- Modify: `components/admin/app-config/app-config-table.tsx` (1x "piu")
- Modify: `components/admin/organizations/adjust-credits-modal.tsx` (1x "non puo")
- Modify: `components/admin/users/users-table.tsx` (1x "non puo")
- Modify: `components/admin/organizations/organizations-table.tsx` (1x "non puo")

- [ ] **Step 1: Fix accents in billing components**

In `components/billing/current-plan-card.tsx`, use replace-all:
- Replace all `funzionalita` with `funzionalità`

In `components/billing/subscription-settings-tab.tsx`:
- Replace all `funzionalita` with `funzionalità`
- Replace all `piu` with `più` (be careful to only match standalone "piu", not inside other words)

In `components/billing/purchase-credits-modal.tsx`:
- Replace `piu` with `più`

- [ ] **Step 2: Fix accents in admin components**

In `components/admin/app-config/app-config-table.tsx`:
- Replace `piu` with `più`

In `components/admin/organizations/adjust-credits-modal.tsx`:
- Replace `non puo` with `non può`

In `components/admin/users/users-table.tsx`:
- Replace `non puo` with `non può`

In `components/admin/organizations/organizations-table.tsx`:
- Replace `non puo` with `non può`

- [ ] **Step 3: Verify no regressions**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/billing/current-plan-card.tsx components/billing/subscription-settings-tab.tsx components/billing/purchase-credits-modal.tsx components/admin/app-config/app-config-table.tsx components/admin/organizations/adjust-credits-modal.tsx components/admin/users/users-table.tsx components/admin/organizations/organizations-table.tsx
git commit -m "fix: add missing Italian accents across billing and admin components (LOC-001)"
```

---

## Task 6: LOC-003 — Replace "Better Auth" with "Supabase Auth" in Marketing Pages

**Files:**
- Modify: `components/marketing/sections/hero-section.tsx:109`
- Modify: `components/marketing/sections/features-section.tsx:78`

- [ ] **Step 1: Fix hero section**

In `components/marketing/sections/hero-section.tsx`, replace:
```tsx
chatbot AI e pannello admin - powered by Better Auth e tRPC.
```
With:
```tsx
chatbot AI e pannello admin - powered by Supabase Auth e tRPC.
```

- [ ] **Step 2: Fix features section**

In `components/marketing/sections/features-section.tsx`, replace:
```tsx
Autenticazione sicura con Better Auth. Supporto integrato per organizzazioni multi-tenant, inviti ai membri e permessi granulari basati sui ruoli.
```
With:
```tsx
Autenticazione sicura con Supabase Auth. Supporto integrato per organizzazioni multi-tenant, inviti ai membri e permessi granulari basati sui ruoli.
```

- [ ] **Step 3: Commit**

```bash
git add components/marketing/sections/hero-section.tsx components/marketing/sections/features-section.tsx
git commit -m "fix: replace 'Better Auth' with 'Supabase Auth' in marketing pages (LOC-003)"
```

---

## Task 7: LOC-002 — Translate Blog Posts to Italian

**Files:**
- Modify: `content/posts/vibe-coding.mdx`
- Modify: `content/posts/mastering-saas-billing.mdx`
- Modify: `content/posts/building-ai-apps.mdx`

- [ ] **Step 1: Translate vibe-coding.mdx**

Read the full content of `content/posts/vibe-coding.mdx`, then rewrite it in Italian. Keep the same structure, frontmatter format, and MDX components. Translate:
- `title` field
- `excerpt` field
- `tags` can remain in English (they are URL slugs)
- All body text

The Italian tone should be informale (tu), modern, and natural for the web. Technical terms like "AI", "IDE", "vibe coding" can stay in English.

- [ ] **Step 2: Translate mastering-saas-billing.mdx**

Same approach — read and rewrite in Italian. Keep `authorName` as-is (it's a demo name). Translate title, excerpt, and all body content.

- [ ] **Step 3: Translate building-ai-apps.mdx**

Same approach — read and rewrite in Italian. Technical terms (API, SDK, LLM, RAG) stay in English.

- [ ] **Step 4: Verify blog renders**

Run: `npm run build` (content collections compile at build time).
Expected: Build succeeds, no content collection errors.

- [ ] **Step 5: Commit**

```bash
git add content/posts/vibe-coding.mdx content/posts/mastering-saas-billing.mdx content/posts/building-ai-apps.mdx
git commit -m "fix: translate blog posts to Italian (LOC-002)"
```

---

## Execution Order

Tasks 1, 3, 4, 5, 6, 7 are independent and can be parallelized.
Task 2 requires a DB migration and should be done carefully (has a dependency on the migration being applied before testing).

**Recommended order:**
1. Tasks 1, 3, 4, 5, 6 in parallel (simple text edits)
2. Task 7 separately (blog translation is content-heavy)
3. Task 2 last (involves DB migration + tRPC change, most complex)

## Final Verification

After all tasks:

```bash
npm run lint && npm run typecheck && npm run build
```

All three must pass with no errors.

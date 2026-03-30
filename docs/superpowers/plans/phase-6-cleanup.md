# Phase 6: Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Final cleanup of package.json scripts, documentation updates, and full build/test verification.
**Depends on:** Phase 5 (all previous phases must be complete)
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md`

---

## Task 25: Final cleanup

### Files

**Modify:**
- `package.json`
- `CLAUDE.md`
- `AGENTS.md`
- `.env.example`

### Steps

- [ ] 1. **Update `package.json` scripts**

  Replace old database/Prisma scripts with Supabase equivalents:

  ```jsonc
  {
    "scripts": {
      // REMOVE these old scripts:
      // "docker:up": "...",
      // "docker:down": "...",
      // "db:migrate": "prisma migrate dev",
      // "db:generate": "prisma generate",
      // "db:studio": "prisma studio",
      // "db:push": "prisma db push",
      // "db:seed": "prisma db seed",
      // "postinstall": "prisma generate",

      // ADD these new scripts:
      "db:start": "supabase start",
      "db:stop": "supabase stop",
      "db:reset": "supabase db reset",
      "db:studio": "supabase studio",
      "db:typegen": "supabase gen types typescript --local > lib/supabase/database.types.ts",
      "db:migrate": "supabase db reset",
      "db:diff": "supabase db diff --local",

      // KEEP these unchanged:
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "biome check .",
      "typecheck": "tsc --noEmit",
      "test": "vitest",
      "e2e": "playwright test"
    }
  }
  ```

  Specifically, open `package.json` and make these changes:
  - Change `"db:migrate"` from any Prisma command to `"supabase db reset"`
  - Change `"db:studio"` from `"prisma studio"` to `"supabase studio"`
  - Add `"db:start"`: `"supabase start"`
  - Add `"db:stop"`: `"supabase stop"`
  - Add `"db:reset"`: `"supabase db reset"`
  - Add `"db:typegen"`: `"supabase gen types typescript --local > lib/supabase/database.types.ts"`
  - Remove `"db:generate"` (was Prisma generate)
  - Remove `"db:push"` (was Prisma push)
  - Remove `"db:seed"` (seeding is now in `supabase/schemas/14-seed.sql`)
  - Remove `"docker:up"` and `"docker:down"` (Supabase CLI manages its own Docker containers)
  - Remove `"postinstall"` if it only ran `prisma generate`

- [ ] 2. **Update `.env.example`**

  Ensure the `.env.example` file reflects the new Supabase variables and removes old ones:

  ```bash
  # === Supabase ===
  NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

  # === Stripe ===
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=
  NEXT_PUBLIC_STRIPE_PRICE_YEARLY=
  NEXT_PUBLIC_STRIPE_PRICE_LIFETIME=

  # === Email ===
  RESEND_API_KEY=
  EMAIL_FROM=

  # === Google OAuth ===
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=

  # === AI ===
  OPENAI_API_KEY=

  # === Monitoring ===
  SENTRY_ORG=
  SENTRY_PROJECT=
  SENTRY_AUTH_TOKEN=
  NEXT_PUBLIC_SENTRY_DSN=

  # === Turnstile ===
  TURNSTILE_SECRET_KEY=
  NEXT_PUBLIC_TURNSTILE_SITE_KEY=

  # === App ===
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

  Make sure these are REMOVED:
  ```bash
  # REMOVE - Database (Prisma)
  # POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT
  # DATABASE_URL, DATABASE_SCHEMA

  # REMOVE - Storage (S3/R2)
  # S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION
  # NEXT_PUBLIC_IMAGES_BUCKET_NAME

  # REMOVE - Auth (Better Auth)
  # BETTER_AUTH_SECRET
  ```

- [ ] 3. **Update `CLAUDE.md`**

  Update these sections:

  **Tech Stack section** -- replace:
  ```markdown
  - **Database**: PostgreSQL with Prisma ORM
  - **Auth**: Better Auth (organizations, 2FA, Google OAuth)
  ```
  With:
  ```markdown
  - **Database**: PostgreSQL via Supabase (client JS + RLS)
  - **Auth**: Supabase Auth (email/password, Google OAuth, MFA TOTP)
  - **Storage**: Supabase Storage
  ```

  **Essential Commands section** -- replace:
  ```markdown
  npm run db:migrate    # Run migrations
  npm run db:studio     # Prisma Studio GUI
  npm run db:generate   # Generate migration
  ```
  With:
  ```markdown
  npm run db:start      # Start Supabase (Docker)
  npm run db:stop       # Stop Supabase
  npm run db:reset      # Reset database (apply all schemas)
  npm run db:studio     # Supabase Studio GUI
  npm run db:typegen    # Regenerate TypeScript types
  ```

  **Project Structure section** -- update:
  ```markdown
  lib/
  ├── auth/                 # Supabase Auth helpers
  ├── billing/              # Stripe billing
  ├── supabase/             # Supabase clients (browser, server, admin)
  ├── storage/              # Supabase Storage helpers
  └── email/                # Email templates
  supabase/
  └── schemas/              # SQL schema files (tables, RLS, functions)
  ```

  **Core Patterns section** -- update Multi-Tenant Data:
  ```markdown
  ### Multi-Tenant Data (CRITICAL)

  Always filter by organization (defense in depth -- RLS also enforces this):

  \`\`\`typescript
  // ✅ CORRECT
  const { data: leads } = await ctx.supabase
    .from('lead')
    .select('*')
    .eq('organization_id', ctx.organization.id);

  // ❌ WRONG - Even though RLS protects, always include org filter
  const { data: leads } = await ctx.supabase
    .from('lead')
    .select('*');
  \`\`\`
  ```

  **Authentication section** -- update:
  ```markdown
  ### Authentication

  \`\`\`typescript
  // Client
  import { createClient } from "@/lib/supabase/client";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Server (tRPC procedures)
  // ctx.supabase and ctx.user are available via protectedProcedure
  const userId = ctx.user.id;

  // Server (outside tRPC)
  import { getUser } from "@/lib/auth/server";
  const user = await getUser();
  \`\`\`
  ```

  **Logging section** -- unchanged.

  **Key Files section** -- update:
  ```markdown
  | File                          | Purpose                    |
  | ----------------------------- | -------------------------- |
  | `config/app.config.ts`        | App settings               |
  | `config/billing.config.ts`    | Plans, pricing             |
  | `supabase/schemas/*.sql`      | Database schema + RLS      |
  | `lib/supabase/database.types.ts` | Auto-generated DB types |
  | `trpc/init.ts`                | tRPC setup                 |
  ```

  **Before Committing section** -- unchanged (still `npm run lint && npm run typecheck`).

- [ ] 4. **Update `AGENTS.md`**

  Apply similar updates as CLAUDE.md:
  - Replace Prisma references with Supabase client JS
  - Replace Better Auth references with Supabase Auth
  - Replace S3/R2 references with Supabase Storage
  - Update database commands
  - Update the architecture diagram if present
  - Update any data access patterns documented there

  Search for specific terms to replace:
  ```bash
  grep -n "Prisma\|prisma\|Better Auth\|betterAuth\|S3\|s3\.\|aws-sdk" AGENTS.md
  ```

- [ ] 5. **Run lint**

  ```bash
  npm run lint
  ```

  Fix any issues found. Common issues at this stage:
  - Unused imports (old Prisma/S3 imports that were missed)
  - Missing imports for new Supabase modules
  - Formatting issues from manual edits

- [ ] 6. **Run typecheck**

  ```bash
  npm run typecheck
  ```

  Fix any TypeScript errors. Common issues:
  - Type mismatches from camelCase to snake_case property names
  - Missing type definitions for Supabase return values
  - Old Prisma type references that weren't updated

- [ ] 7. **Run production build**

  ```bash
  npm run build
  ```

  This is the ultimate verification. A successful build means:
  - All imports resolve
  - All types check
  - All pages compile
  - No dead code references

  Fix any build errors.

- [ ] 8. **Run unit tests**

  ```bash
  npm run test
  ```

  Some tests may fail due to:
  - Mocked Prisma calls that need to be updated to mock Supabase
  - Changed return value shapes (snake_case vs camelCase)
  - Removed functions/modules

  Update test files as needed. For tests that mock database calls, update to mock Supabase client:

  ```typescript
  // OLD mock pattern:
  vi.mock("@/lib/db", () => ({ prisma: { lead: { findMany: vi.fn() } } }));

  // NEW mock pattern:
  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      })),
    })),
  }));
  ```

- [ ] 9. **Full end-to-end test**

  Start the dev server and Supabase, then test the complete flow manually:

  ```bash
  # Terminal 1: Start Supabase
  npm run db:start

  # Terminal 2: Start dev server
  npm run dev
  ```

  Test these flows:
  - [ ] **Sign up** with email/password
  - [ ] **Sign in** with email/password
  - [ ] **Create organization**
  - [ ] **Invite member** (if email is configured)
  - [ ] **Create lead** in organization
  - [ ] **Edit lead**
  - [ ] **Delete lead**
  - [ ] **Bulk operations** on leads
  - [ ] **Export leads** to CSV/Excel
  - [ ] **AI chat** -- create, send message, pin, delete
  - [ ] **Upload avatar** image
  - [ ] **Upload org logo** image
  - [ ] **View credit balance**
  - [ ] **Switch organization** (if user has multiple)
  - [ ] **Admin panel** -- list users, list orgs (if user is admin)
  - [ ] **Sign out**

- [ ] 10. **Run E2E tests (if Playwright tests exist)**

  ```bash
  npm run e2e
  ```

  Update any failing E2E tests that depend on old auth flows or API patterns.

- [ ] 11. **Final search for orphaned references**

  ```bash
  # Search for any remaining old references
  grep -r "prisma\|Prisma\|@prisma" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v ".git"
  grep -r "better-auth\|betterAuth\|BetterAuth" --include="*.ts" --include="*.tsx" . | grep -v node_modules
  grep -r "aws-sdk\|S3Client\|s3Client\|getSignedUrl\|getSignedUploadUrl" --include="*.ts" --include="*.tsx" . | grep -v node_modules
  grep -r "storageConfig\|storage.config" --include="*.ts" --include="*.tsx" . | grep -v node_modules
  ```

  Fix any remaining references found.

- [ ] 12. **Verify `node_modules` is clean**

  ```bash
  # Ensure removed packages are actually gone
  ls node_modules/@prisma 2>/dev/null && echo "WARNING: @prisma still in node_modules" || echo "OK: @prisma removed"
  ls node_modules/better-auth 2>/dev/null && echo "WARNING: better-auth still in node_modules" || echo "OK: better-auth removed"
  ls node_modules/@aws-sdk 2>/dev/null && echo "WARNING: @aws-sdk still in node_modules" || echo "OK: @aws-sdk removed"
  ```

  If any are still present, run:
  ```bash
  rm -rf node_modules
  npm install
  ```

- [ ] 13. **Commit**: `git commit -m "chore(task-25): final cleanup - update scripts, docs, and verify build"`

---

## Verification Checklist

After completing this phase (and the entire migration):

- [ ] `package.json` scripts use Supabase commands (no Prisma/Docker references)
- [ ] `.env.example` has Supabase vars, no Prisma/S3/Better Auth vars
- [ ] `CLAUDE.md` accurately reflects the new tech stack and patterns
- [ ] `AGENTS.md` accurately reflects the new tech stack and patterns
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes (unit tests)
- [ ] Manual E2E smoke test passes for all major flows
- [ ] No references to Prisma, Better Auth, S3/R2, or aws-sdk remain in application code
- [ ] No orphaned packages in `node_modules`

## Migration Complete

At this point, the entire Supabase migration is complete:

| Component | Before | After |
|-----------|--------|-------|
| Auth | Better Auth | Supabase Auth |
| Database | Prisma ORM | Supabase client JS |
| Storage | S3/R2 | Supabase Storage |
| Security | Application-only WHERE | RLS + application WHERE |
| Session | Server-side sessions | JWT (getClaims) |
| DB Types | Prisma generated | supabase gen types |

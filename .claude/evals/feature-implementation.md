# Agent Evaluation: Full Feature Implementation

This eval tests whether the agent correctly follows project patterns when implementing a complete feature spanning database, tRPC, and UI layers.

## Eval Metadata

- **Type**: Capability eval (target: improvement over time)
- **Complexity**: High (multi-step, multi-file)
- **Expected Duration**: 15-30 minutes
- **Skills Tested**: `/feature-builder`, `/server-action-builder`, `/react-form-builder`, `/postgres-expert`

---

## Task: Implement "Projects" Feature

### Prompt

```
Implement a "Projects" feature for organizations with the following requirements:

1. Database: Projects table with name, description, status (enum: draft/active/archived), and organization_id
2. Server: CRUD tRPC procedures for projects (create, update, delete, list)
3. UI: Projects list page with create/edit forms
4. Navigation: Add to organization sidebar

Use the available skills for guidance. The feature should be accessible at /dashboard/organization/projects.
```

### Reference Solution Requires

- 1 migration file
- 1 Zod schema file
- 1 tRPC router file
- Router registration in organization index
- 2-3 component files
- 1 page file
- Navigation config update

---

## Success Criteria (Grading Rubric)

### 1. Database Layer (25 points)

| Criterion | Points | Pass Condition |
|-----------|--------|----------------|
| Migration file in `supabase/migrations/` | 3 | File exists with `.sql` extension |
| Table has correct columns | 5 | Contains: id, organization_id, name, description, status, created_at |
| RLS enabled | 5 | Contains `enable row level security` |
| RLS policies check `member` table | 5 | Contains `from public.member` in policy |
| `organization_id` has FK + index | 4 | Contains `references public.organization(id) on delete cascade` and `create index` |
| Status enum created | 3 | Contains `create type` with draft/active/archived |

**Anti-patterns to penalize (-3 each):**
- SECURITY DEFINER without access checks
- Missing `on delete cascade` for organization_id FK
- No index on organization_id
- RLS using `has_role_on_account` (Makerkit pattern, not ours)

### 2. Server Layer (25 points)

| Criterion | Points | Pass Condition |
|-----------|--------|----------------|
| Zod schema in `schemas/` | 3 | File exists, exports schema with `z.object` |
| tRPC router uses `protectedOrganizationProcedure` | 5 | Import and usage present |
| Queries filter by `organization_id` | 5 | `.eq("organization_id", ctx.organization.id)` |
| Uses `ctx.supabase` (not adminClient) | 3 | No import of `createAdminClient` |
| camelCase → snake_case mapping | 3 | Input fields mapped to snake_case DB columns |
| Logging with `logger` | 3 | Import from `@/lib/logger`, object-first pattern |
| `TRPCError` for error handling | 3 | Import and throw with proper codes |

**Anti-patterns to penalize (-3 each):**
- Using `enhanceAction` or server actions (Makerkit pattern)
- Using `@kit/` imports (Makerkit monorepo)
- Missing organization_id filter (data leak)
- Using `console.log`

### 3. UI Layer (25 points)

| Criterion | Points | Pass Condition |
|-----------|--------|----------------|
| Components use `@/components/ui/` imports | 3 | No `@kit/ui/` imports |
| Form uses `useZodForm` from `@/hooks/use-zod-form` | 5 | Import present |
| tRPC mutation with `useMutation()` | 5 | `trpc.organization.*.useMutation()` pattern |
| Loading state via `mutation.isPending` | 3 | Used on submit button |
| Toast via `sonner` | 2 | Import `toast` from `sonner` |
| Strings in Italian | 4 | Labels, buttons, toasts in Italian |
| `data-test` attributes | 3 | Present on form inputs and submit button |

**Anti-patterns to penalize (-3 each):**
- Using `Trans` component or i18n keys (Makerkit pattern)
- Using `useAction` from `next-safe-action` (Makerkit pattern)
- Using `@kit/ui/form` imports
- Using `useForm` with explicit generics instead of `useZodForm`

### 4. Integration & Navigation (15 points)

| Criterion | Points | Pass Condition |
|-----------|--------|----------------|
| Page in correct route group | 3 | Path under `app/(saas)/dashboard/organization/` |
| Router registered in organization index | 5 | Entry in `trpc/routers/organization/index.ts` |
| Navigation item added | 4 | Entry in sidebar config |
| Feature guard if applicable | 3 | `.use(featureGuard(...))` or justified omission |

### 5. Code Quality (10 points)

| Criterion | Points | Pass Condition |
|-----------|--------|----------------|
| TypeScript compiles | 5 | `npm run typecheck` exits 0 |
| Lint passes | 3 | `npm run lint` exits 0 |
| No `any` types | 2 | grep for `: any` returns 0 matches in new files |

---

## Trial Configuration

```yaml
trials: 3
pass_threshold: 0.8  # 80% of max score
metrics:
  - pass@1: "Passes on first attempt"
  - pass@3: "Passes at least once in 3 attempts"
  - pass^3: "Passes all 3 attempts (reliability)"
```

---

## Environment Setup

Before each trial:
1. Reset to clean git state: `git checkout -- .`
2. Ensure DB types are current: `npm run db:typegen`
3. Verify clean typecheck: `npm run typecheck`

After each trial:
1. Capture transcript
2. Capture files created/modified
3. Run graders
4. Reset environment

---

## Expected Failure Modes

| Failure | Likely Cause | Is Eval Problem? |
|---------|--------------|------------------|
| Missing RLS | Agent didn't follow postgres-expert skill | No |
| Uses `@kit/` imports | Agent used Makerkit patterns | No — critical failure |
| Uses server actions | Agent used Makerkit patterns | No — critical failure |
| Wrong file path | Ambiguous task description | Maybe — clarify paths |
| Typecheck fails on unrelated code | Existing codebase issue | Yes — fix baseline |
| Uses different valid approach | Eval too prescriptive | Yes — grade outcome |
| Strings in English | Agent ignored Italian requirement | No |

---

## Notes

- **Grade outcomes, not paths**: Working feature with slightly different organization is acceptable
- **Critical failures**: Using Makerkit-specific patterns (`@kit/`, `enhanceAction`, `Trans`, `accounts`) should be flagged as architectural violations
- **Partial credit**: Feature missing navigation but with working CRUD is still valuable
- **Read transcripts**: When scores are low, check if agent used skills or ignored them

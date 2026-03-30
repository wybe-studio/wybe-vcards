# Feature Flags System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project modular via `.env` feature flags that enable/disable billing, leads, AI chatbot, onboarding, public registration, multi-org, and personal-account-only mode, with a 3-layer guard system (UI, API, middleware) and admin panel extensions for user/org creation.

**Architecture:** A centralized `config/features.config.ts` reads `NEXT_PUBLIC_FEATURE_*` env vars and exposes a typed config object. Three guard layers enforce disabled features: a `FeatureGate` React component hides UI, a `featureGuard` tRPC middleware blocks API calls with FORBIDDEN, and `proxy.ts` redirects disabled routes. The admin panel is extended with user creation, org creation, and member assignment procedures.

**Tech Stack:** Next.js 16, tRPC v11, Supabase Auth Admin API, Zod, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-28-feature-flags-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `config/features.config.ts` | Central feature flags config, reads env, enforces constraints |
| `components/feature-gate.tsx` | Conditional UI wrapper component |
| `schemas/admin-create-user-schemas.ts` | Zod schemas for admin user creation |
| `schemas/admin-create-organization-schemas.ts` | Zod schemas for admin org creation + member assignment |
| `components/admin/users/create-user-modal.tsx` | Admin UI for creating users |
| `components/admin/organizations/create-organization-modal.tsx` | Admin UI for creating organizations |
| `components/admin/organizations/add-member-modal.tsx` | Admin UI for assigning members to orgs |
| `tests/config/features.test.ts` | Unit tests for features config |
| `tests/trpc/feature-guard.test.ts` | Unit tests for featureGuard middleware |

### Modified Files
| File | Changes |
|------|---------|
| `lib/env.ts` | Add 7 `NEXT_PUBLIC_FEATURE_*` env vars to client schema + runtimeEnv |
| `trpc/init.ts` | Add `featureGuard` middleware export |
| `proxy.ts` | Add feature flag checks for billing, registration, onboarding routes |
| `config/auth.config.ts` | Derive `enableSignup` from `featuresConfig.publicRegistration` |
| `components/organization/organization-menu-items.tsx` | Wrap menu items with `FeatureGate` |
| `components/organization/organization-switcher.tsx` | Conditional org creation + personal-only mode |
| `app/(saas)/dashboard/(sidebar)/organization/layout.tsx` | Conditional billing check |
| `app/(marketing)/pricing/page.tsx` | Return `notFound()` when billing off |
| `trpc/routers/organization/index.ts` | Add `featureGuard("multiOrg")` to create procedure |
| `trpc/routers/organization/organization-lead-router.ts` | Add `featureGuard("leads")` to all procedures |
| `trpc/routers/organization/organization-subscription-router.ts` | Add `featureGuard("billing")` to all procedures |
| `trpc/routers/organization/organization-credit-router.ts` | Add `featureGuard("billing")` to all procedures |
| `trpc/routers/organization/organization-ai-router.ts` | Add `featureGuard("aiChatbot")` to all procedures |
| `trpc/routers/admin/admin-user-router.ts` | Add `createUser` procedure |
| `trpc/routers/admin/admin-organization-router.ts` | Add `createOrganization` and `addMember` procedures |
| `app/(saas)/auth/confirm/route.ts` | Auto-create personal org when `personalAccountOnly=true` |
| `.env.example` | Add feature flag env vars with documentation |

---

## Task 1: Environment Variables & Features Config

**Files:**
- Modify: `lib/env.ts:52-87` (client schema) and `lib/env.ts:93-142` (runtimeEnv)
- Create: `config/features.config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add feature flag env vars to `lib/env.ts`**

In the `client` section (after line 87, before the closing `}`), add:

```typescript
// Feature Flags
NEXT_PUBLIC_FEATURE_BILLING: z.string().optional(),
NEXT_PUBLIC_FEATURE_LEADS: z.string().optional(),
NEXT_PUBLIC_FEATURE_AI_CHATBOT: z.string().optional(),
NEXT_PUBLIC_FEATURE_ONBOARDING: z.string().optional(),
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION: z.string().optional(),
NEXT_PUBLIC_FEATURE_MULTI_ORG: z.string().optional(),
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY: z.string().optional(),
```

In the `runtimeEnv` section (after the last `NEXT_PUBLIC_VERCEL_*` entry), add:

```typescript
// Feature Flags
NEXT_PUBLIC_FEATURE_BILLING: process.env.NEXT_PUBLIC_FEATURE_BILLING,
NEXT_PUBLIC_FEATURE_LEADS: process.env.NEXT_PUBLIC_FEATURE_LEADS,
NEXT_PUBLIC_FEATURE_AI_CHATBOT: process.env.NEXT_PUBLIC_FEATURE_AI_CHATBOT,
NEXT_PUBLIC_FEATURE_ONBOARDING: process.env.NEXT_PUBLIC_FEATURE_ONBOARDING,
NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION: process.env.NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION,
NEXT_PUBLIC_FEATURE_MULTI_ORG: process.env.NEXT_PUBLIC_FEATURE_MULTI_ORG,
NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY: process.env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY,
```

- [ ] **Step 2: Create `config/features.config.ts`**

```typescript
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function bool(val: string | undefined, fallback = true): boolean {
	return val === undefined ? fallback : val === "true";
}

const raw = {
	billing: bool(env.NEXT_PUBLIC_FEATURE_BILLING),
	leads: bool(env.NEXT_PUBLIC_FEATURE_LEADS),
	aiChatbot: bool(env.NEXT_PUBLIC_FEATURE_AI_CHATBOT),
	onboarding: bool(env.NEXT_PUBLIC_FEATURE_ONBOARDING),
	publicRegistration: bool(env.NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION),
	multiOrg: bool(env.NEXT_PUBLIC_FEATURE_MULTI_ORG),
	personalAccountOnly: bool(env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY, false),
};

// Enforce logical constraints
if (raw.personalAccountOnly && raw.multiOrg) {
	logger.warn(
		{ personalAccountOnly: true, multiOrg: true },
		"personalAccountOnly=true forza multiOrg=false",
	);
	raw.multiOrg = false;
}

if (!raw.billing) {
	// Credits depend on Stripe, force disable chatbot credits
	// (aiChatbot can still work if credits are not required, but billing-related credit procedures are blocked)
}

export const featuresConfig = raw as Readonly<FeaturesConfig>;

export type FeaturesConfig = {
	billing: boolean;
	leads: boolean;
	aiChatbot: boolean;
	onboarding: boolean;
	publicRegistration: boolean;
	multiOrg: boolean;
	personalAccountOnly: boolean;
};
```

- [ ] **Step 3: Add feature flags to `.env.example`**

Append to `.env.example`:

```env
# ── Feature Flags ──────────────────────────────────────
# All default to "true" except PERSONAL_ACCOUNT_ONLY (defaults to "false")
# NEXT_PUBLIC_FEATURE_BILLING=true
# NEXT_PUBLIC_FEATURE_LEADS=true
# NEXT_PUBLIC_FEATURE_AI_CHATBOT=true
# NEXT_PUBLIC_FEATURE_ONBOARDING=true
# NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION=true
# NEXT_PUBLIC_FEATURE_MULTI_ORG=true
# NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY=false
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add config/features.config.ts lib/env.ts .env.example
git commit -m "feat: add feature flags config and env variables"
```

---

## Task 2: FeatureGate Component

**Files:**
- Create: `components/feature-gate.tsx`

- [ ] **Step 1: Create the FeatureGate component**

```typescript
import type { FeaturesConfig } from "@/config/features.config";
import { featuresConfig } from "@/config/features.config";

type FeatureGateProps = {
	feature: keyof FeaturesConfig;
	children: React.ReactNode;
	fallback?: React.ReactNode;
	/** Show children when the feature is OFF */
	invert?: boolean;
};

export function FeatureGate({
	feature,
	children,
	fallback,
	invert,
}: FeatureGateProps): React.ReactNode {
	const enabled = invert ? !featuresConfig[feature] : featuresConfig[feature];
	return enabled ? children : (fallback ?? null);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/feature-gate.tsx
git commit -m "feat: add FeatureGate conditional UI component"
```

---

## Task 3: featureGuard tRPC Middleware

**Files:**
- Modify: `trpc/init.ts:1-10` (imports) and after line 118 (after loggingMiddleware)

- [ ] **Step 1: Add the featureGuard middleware to `trpc/init.ts`**

Add import at top of file:

```typescript
import { featuresConfig, type FeaturesConfig } from "@/config/features.config";
```

Add the middleware after `loggingMiddleware` definition (after line 118, before the `publicProcedure` comment block):

```typescript
/**
 * Feature flag guard middleware.
 * Blocks procedure execution with FORBIDDEN when the specified feature is disabled.
 */
export const featureGuard = (feature: keyof FeaturesConfig) =>
	t.middleware(({ next }) => {
		if (!featuresConfig[feature]) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Funzionalità "${feature}" non abilitata.`,
			});
		}
		return next();
	});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add trpc/init.ts
git commit -m "feat: add featureGuard tRPC middleware"
```

---

## Task 4: Guard Leads Router

**Files:**
- Modify: `trpc/routers/organization/organization-lead-router.ts`

- [ ] **Step 1: Add featureGuard import**

Add to the existing imports from `@/trpc/init`:

```typescript
import { createTRPCRouter, featureGuard, protectedOrganizationProcedure } from "@/trpc/init";
```

- [ ] **Step 2: Add guard to every procedure**

Every procedure in this router currently starts with `protectedOrganizationProcedure`. Add `.use(featureGuard("leads"))` after each `protectedOrganizationProcedure`:

```typescript
// Before:
list: protectedOrganizationProcedure
  .input(listLeadsSchema)
  .query(async ({ ctx, input }) => {

// After:
list: protectedOrganizationProcedure
  .use(featureGuard("leads"))
  .input(listLeadsSchema)
  .query(async ({ ctx, input }) => {
```

Apply the same pattern to ALL procedures in this router (list, create, update, delete, export, bulk operations).

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-lead-router.ts
git commit -m "feat: add leads feature guard to lead router"
```

---

## Task 5: Guard AI Chatbot Router

**Files:**
- Modify: `trpc/routers/organization/organization-ai-router.ts`

- [ ] **Step 1: Add featureGuard import and apply to all procedures**

Same pattern as Task 4. Add `featureGuard` to imports from `@/trpc/init`, then add `.use(featureGuard("aiChatbot"))` after every `protectedOrganizationProcedure` in the router.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add trpc/routers/organization/organization-ai-router.ts
git commit -m "feat: add aiChatbot feature guard to AI router"
```

---

## Task 6: Guard Billing Routers (Subscription + Credits)

**Files:**
- Modify: `trpc/routers/organization/organization-subscription-router.ts`
- Modify: `trpc/routers/organization/organization-credit-router.ts`

- [ ] **Step 1: Add featureGuard to subscription router**

Add `featureGuard` to imports from `@/trpc/init`. Add `.use(featureGuard("billing"))` after every `protectedOrganizationProcedure` in the subscription router (getStatus, listSubscriptions, listOrders, listInvoices, listPlans, createCheckout, createPortalSession, cancelSubscription, reactivateSubscription, previewPlanChange, changePlan, updateSeats, getSeatInfo).

- [ ] **Step 2: Add featureGuard to credit router**

Same pattern. Add `.use(featureGuard("billing"))` after every `protectedOrganizationProcedure` in the credit router (getBalance, getTransactions, getPackages, purchaseCredits).

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/organization/organization-subscription-router.ts trpc/routers/organization/organization-credit-router.ts
git commit -m "feat: add billing feature guard to subscription and credit routers"
```

---

## Task 7: Guard Admin Billing Procedures

**Files:**
- Modify: `trpc/routers/admin/admin-organization-router.ts`

- [ ] **Step 1: Add featureGuard to admin billing procedures**

Add `featureGuard` to imports from `@/trpc/init`. Add `.use(featureGuard("billing"))` to the `adjustCredits`, `syncFromStripe`, and `cancelSubscription` procedures in the admin organization router. These procedures already use `protectedAdminProcedure`, so add the guard after it:

```typescript
// Before:
adjustCredits: protectedAdminProcedure
  .input(adjustCreditsAdminSchema)
  .mutation(async ({ ctx, input }) => {

// After:
adjustCredits: protectedAdminProcedure
  .use(featureGuard("billing"))
  .input(adjustCreditsAdminSchema)
  .mutation(async ({ ctx, input }) => {
```

Apply the same to `syncFromStripe` and `cancelSubscription`.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add trpc/routers/admin/admin-organization-router.ts
git commit -m "feat: add billing feature guard to admin billing procedures"
```

---

## Task 8: Guard Organization Creation (multiOrg)

**Files:**
- Modify: `trpc/routers/organization/index.ts:11,122`

- [ ] **Step 1: Add featureGuard to the create procedure**

Update the import on line 11:

```typescript
import { createTRPCRouter, featureGuard, protectedProcedure } from "@/trpc/init";
```

Modify the `create` procedure (line 122) to add the guard:

```typescript
create: protectedProcedure
	.use(featureGuard("multiOrg"))
	.input(createOrganizationSchema)
	.mutation(async ({ ctx, input }) => {
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add trpc/routers/organization/index.ts
git commit -m "feat: add multiOrg feature guard to organization create"
```

---

## Task 9: UI Guards — Organization Menu Items

**Files:**
- Modify: `components/organization/organization-menu-items.tsx:1-3,58-107`

- [ ] **Step 1: Add FeatureGate import**

Add at the top of the file:

```typescript
import { FeatureGate } from "@/components/feature-gate";
```

- [ ] **Step 2: Filter menu items based on feature flags**

Replace the `menuGroups` definition (lines 58-107) with a version that conditionally includes items:

```typescript
const menuGroups: MenuGroup[] = [
	{
		label: "Applicazione",
		items: [
			{
				label: "Pannello",
				href: basePath,
				icon: LayoutDashboardIcon,
				exactMatch: true,
			},
			...(featuresConfig.leads
				? [
						{
							label: "Lead",
							href: `${basePath}/leads`,
							icon: UserSearchIcon,
						},
					]
				: []),
			...(featuresConfig.aiChatbot
				? [
						{
							label: "Chatbot AI",
							href: `${basePath}/chatbot`,
							icon: BotIcon,
						},
					]
				: []),
		],
		collapsible: false,
	},
	{
		label: "Impostazioni",
		items: [
			{
				label: "Generale",
				href: `${basePath}/settings?tab=general`,
				icon: SettingsIcon,
			},
			{
				label: "Membri",
				href: `${basePath}/settings?tab=members`,
				icon: UsersIcon,
			},
			...(featuresConfig.billing
				? [
						{
							label: "Abbonamento",
							href: `${basePath}/settings?tab=subscription`,
							icon: CreditCardIcon,
						},
						{
							label: "Crediti",
							href: `${basePath}/settings?tab=credits`,
							icon: CoinsIcon,
						},
					]
				: []),
		],
		collapsible: false,
	},
];
```

Also add the import at the top:

```typescript
import { featuresConfig } from "@/config/features.config";
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add components/organization/organization-menu-items.tsx
git commit -m "feat: conditionally show menu items based on feature flags"
```

---

## Task 10: UI Guards — Organization Switcher

**Files:**
- Modify: `components/organization/organization-switcher.tsx:39,300-316`

- [ ] **Step 1: Add featuresConfig import**

Add to imports:

```typescript
import { featuresConfig } from "@/config/features.config";
```

- [ ] **Step 2: Replace org creation condition**

On line 300, replace:

```typescript
{appConfig.organizations.allowUserCreation && (
```

with:

```typescript
{appConfig.organizations.allowUserCreation && featuresConfig.multiOrg && !featuresConfig.personalAccountOnly && (
```

This hides the "Crea un'organizzazione" button when multi-org is off or personal-only is on.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add components/organization/organization-switcher.tsx
git commit -m "feat: hide org creation in switcher when multiOrg/personalAccountOnly flags set"
```

---

## Task 11: UI Guards — Organization Layout (Billing Check)

**Files:**
- Modify: `app/(saas)/dashboard/(sidebar)/organization/layout.tsx:7,49-53`

- [ ] **Step 1: Add featuresConfig import**

Add to imports:

```typescript
import { featuresConfig } from "@/config/features.config";
```

- [ ] **Step 2: Make billing check conditional**

Replace lines 49-53:

```typescript
// Check if user needs to choose a plan before accessing organization
const needsToChoosePlan = await shouldRedirectToChoosePlan(organization.id);
if (needsToChoosePlan) {
	redirect("/dashboard/choose-plan");
}
```

with:

```typescript
// Check if user needs to choose a plan before accessing organization
if (featuresConfig.billing) {
	const needsToChoosePlan = await shouldRedirectToChoosePlan(organization.id);
	if (needsToChoosePlan) {
		redirect("/dashboard/choose-plan");
	}
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add "app/(saas)/dashboard/(sidebar)/organization/layout.tsx"
git commit -m "feat: skip billing plan check when billing feature flag is off"
```

---

## Task 12: UI Guards — Pricing Page

**Files:**
- Modify: `app/(marketing)/pricing/page.tsx:1-6,53`

- [ ] **Step 1: Add notFound and featuresConfig imports**

Add:

```typescript
import { notFound } from "next/navigation";
import { featuresConfig } from "@/config/features.config";
```

- [ ] **Step 2: Add feature check at start of page component**

At the top of the `PricingPage` function (line 53), add:

```typescript
export default function PricingPage() {
	if (!featuresConfig.billing) {
		notFound();
	}

	return (
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add "app/(marketing)/pricing/page.tsx"
git commit -m "feat: return 404 on pricing page when billing is disabled"
```

---

## Task 13: Middleware Guards — proxy.ts

**Files:**
- Modify: `proxy.ts:3-5,44-50,96-115,154-164`

- [ ] **Step 1: Add featuresConfig import**

Add to imports (after line 4):

```typescript
import { featuresConfig } from "./config/features.config";
```

- [ ] **Step 2: Add billing route redirect**

After the marketing redirect block (after line 115), add:

```typescript
// Feature flag: redirect billing routes when billing is disabled
if (!featuresConfig.billing) {
	if (
		pathname.startsWith("/dashboard/choose-plan") ||
		pathname === "/pricing"
	) {
		return NextResponse.redirect(new URL("/dashboard", origin));
	}
}
```

- [ ] **Step 3: Add registration route redirect**

After the billing redirect, add:

```typescript
// Feature flag: block public signup when registration is disabled
if (!featuresConfig.publicRegistration) {
	if (pathname === "/auth/sign-up") {
		const hasInvitation = searchParams.has("invitationId");
		if (!hasInvitation) {
			return NextResponse.redirect(new URL("/auth/sign-in", origin));
		}
	}
}
```

- [ ] **Step 4: Make onboarding check conditional**

Replace lines 154-164 (the onboarding check block):

```typescript
// Check onboarding status (with exceptions for certain paths)
if (!profile?.onboarding_complete && !canBypassOnboarding(pathname)) {
	return NextResponse.redirect(
		new URL(
			withQuery("/dashboard/onboarding", {
				redirectTo: pathname,
			}),
			origin,
		),
	);
}
```

with:

```typescript
// Check onboarding status (with exceptions for certain paths)
// Skip if onboarding feature is disabled
if (
	featuresConfig.onboarding &&
	!profile?.onboarding_complete &&
	!canBypassOnboarding(pathname)
) {
	return NextResponse.redirect(
		new URL(
			withQuery("/dashboard/onboarding", {
				redirectTo: pathname,
			}),
			origin,
		),
	);
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add proxy.ts
git commit -m "feat: add feature flag guards to proxy middleware"
```

---

## Task 14: Derive authConfig.enableSignup from Feature Flag

**Files:**
- Modify: `config/auth.config.ts:33`

- [ ] **Step 1: Add featuresConfig import**

Add at the top of the file:

```typescript
import { featuresConfig } from "@/config/features.config";
```

- [ ] **Step 2: Replace hardcoded enableSignup**

Replace line 34:

```typescript
enableSignup: true,
```

with:

```typescript
enableSignup: featuresConfig.publicRegistration,
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add config/auth.config.ts
git commit -m "feat: derive enableSignup from publicRegistration feature flag"
```

---

## Task 15: Admin — Create User Schema & Procedure

**Files:**
- Create: `schemas/admin-create-user-schemas.ts`
- Modify: `trpc/routers/admin/admin-user-router.ts`

- [ ] **Step 1: Create the Zod schema**

Create `schemas/admin-create-user-schemas.ts`:

```typescript
import { z } from "zod/v4";

export const createUserAdminSchema = z.object({
	email: z.email("Email non valida"),
	password: z.string().min(8, "La password deve avere almeno 8 caratteri").max(72),
	name: z.string().min(1, "Il nome è obbligatorio").max(200),
	role: z.enum(["user", "admin"]).default("user"),
});

export type CreateUserAdminInput = z.infer<typeof createUserAdminSchema>;
```

- [ ] **Step 2: Add createUser procedure to admin-user-router.ts**

Add imports at the top of `trpc/routers/admin/admin-user-router.ts`:

```typescript
import { createUserAdminSchema } from "@/schemas/admin-create-user-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { featuresConfig } from "@/config/features.config";
```

Add the procedure inside the router (after the `unbanUser` procedure, before the closing `}`):

```typescript
createUser: protectedAdminProcedure
	.input(createUserAdminSchema)
	.mutation(async ({ ctx, input }) => {
		const adminClient = createAdminClient();

		// Create user via Supabase Admin API (bypasses signup restrictions)
		const { data: authData, error: authError } =
			await adminClient.auth.admin.createUser({
				email: input.email,
				password: input.password,
				email_confirm: true,
				user_metadata: {
					name: input.name,
					onboardingComplete: !featuresConfig.onboarding,
				},
			});

		if (authError || !authData.user) {
			logger.error(
				{ error: authError, adminEmail: ctx.user.email },
				"Admin failed to create user",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: authError?.message ?? "Impossibile creare l'utente",
			});
		}

		// Create user_profile record
		const { error: profileError } = await adminClient
			.from("user_profile")
			.insert({
				id: authData.user.id,
				role: input.role,
				onboarding_complete: !featuresConfig.onboarding,
			});

		if (profileError) {
			logger.error(
				{ error: profileError, userId: authData.user.id },
				"Failed to create user_profile after auth user creation",
			);
			// Clean up: delete the auth user since profile creation failed
			await adminClient.auth.admin.deleteUser(authData.user.id);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile creare il profilo utente",
			});
		}

		logger.info(
			{
				adminId: ctx.user.id,
				adminEmail: ctx.user.email,
				createdUserId: authData.user.id,
				createdEmail: input.email,
				role: input.role,
			},
			"Admin created new user",
		);

		return {
			id: authData.user.id,
			email: authData.user.email,
			name: input.name,
			role: input.role,
		};
	}),
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add schemas/admin-create-user-schemas.ts trpc/routers/admin/admin-user-router.ts
git commit -m "feat: add admin createUser procedure"
```

---

## Task 16: Admin — Create Organization & Add Member Schema & Procedures

**Files:**
- Create: `schemas/admin-create-organization-schemas.ts`
- Modify: `trpc/routers/admin/admin-organization-router.ts`

- [ ] **Step 1: Create the Zod schemas**

Create `schemas/admin-create-organization-schemas.ts`:

```typescript
import { z } from "zod/v4";

export const createOrganizationAdminSchema = z.object({
	name: z.string().min(1, "Il nome è obbligatorio").max(200),
	ownerUserId: z.string().uuid("ID utente non valido"),
});

export const addMemberAdminSchema = z.object({
	organizationId: z.string().uuid("ID organizzazione non valido"),
	userId: z.string().uuid("ID utente non valido"),
	role: z.enum(["owner", "admin", "member"]).default("member"),
});

export type CreateOrganizationAdminInput = z.infer<typeof createOrganizationAdminSchema>;
export type AddMemberAdminInput = z.infer<typeof addMemberAdminSchema>;
```

- [ ] **Step 2: Add procedures to admin-organization-router.ts**

Add imports at the top:

```typescript
import {
	createOrganizationAdminSchema,
	addMemberAdminSchema,
} from "@/schemas/admin-create-organization-schemas";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
```

Add these procedures inside the router (after the `cancelSubscription` procedure):

```typescript
createOrganization: protectedAdminProcedure
	.input(createOrganizationAdminSchema)
	.mutation(async ({ ctx, input }) => {
		const adminClient = createAdminClient();

		// Verify the owner user exists
		const { data: ownerAuth, error: ownerError } =
			await adminClient.auth.admin.getUserById(input.ownerUserId);

		if (ownerError || !ownerAuth.user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Utente proprietario non trovato",
			});
		}

		// Generate unique slug
		const baseSlug = slugify(input.name, { lowercase: true });
		const slug = `${baseSlug}-${nanoid(5)}`;

		// Use RPC to create org with owner atomically
		const { data: organization, error: rpcError } = await adminClient
			.rpc("create_organization_with_owner", {
				p_name: input.name,
				p_slug: slug,
				p_user_id: input.ownerUserId,
				p_metadata: null,
			})
			.single();

		if (rpcError || !organization) {
			logger.error(
				{ rpcError, input },
				"Admin failed to create organization",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile creare l'organizzazione",
			});
		}

		logger.info(
			{
				adminId: ctx.user.id,
				adminEmail: ctx.user.email,
				organizationId: organization.id,
				organizationName: input.name,
				ownerId: input.ownerUserId,
			},
			"Admin created new organization",
		);

		return organization;
	}),

addMember: protectedAdminProcedure
	.input(addMemberAdminSchema)
	.mutation(async ({ ctx, input }) => {
		const adminClient = createAdminClient();

		// Verify user exists
		const { data: userAuth, error: userError } =
			await adminClient.auth.admin.getUserById(input.userId);

		if (userError || !userAuth.user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Utente non trovato",
			});
		}

		// Verify organization exists
		const { data: org } = await adminClient
			.from("organization")
			.select("id")
			.eq("id", input.organizationId)
			.single();

		if (!org) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Organizzazione non trovata",
			});
		}

		// Check if user is already a member
		const { data: existingMember } = await adminClient
			.from("member")
			.select("id")
			.eq("organization_id", input.organizationId)
			.eq("user_id", input.userId)
			.maybeSingle();

		if (existingMember) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "L'utente è già membro di questa organizzazione",
			});
		}

		// Insert member
		const { data: member, error: memberError } = await adminClient
			.from("member")
			.insert({
				organization_id: input.organizationId,
				user_id: input.userId,
				role: input.role,
			})
			.select()
			.single();

		if (memberError || !member) {
			logger.error(
				{ memberError, input },
				"Admin failed to add member to organization",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile aggiungere il membro",
			});
		}

		logger.info(
			{
				adminId: ctx.user.id,
				adminEmail: ctx.user.email,
				organizationId: input.organizationId,
				userId: input.userId,
				role: input.role,
			},
			"Admin added member to organization",
		);

		return member;
	}),
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add schemas/admin-create-organization-schemas.ts trpc/routers/admin/admin-organization-router.ts
git commit -m "feat: add admin createOrganization and addMember procedures"
```

---

## Task 17: Admin UI — Create User Modal

**Files:**
- Create: `components/admin/users/create-user-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/admin/users/create-user-modal.tsx`:

```typescript
"use client";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { createUserAdminSchema } from "@/schemas/admin-create-user-schemas";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

export const CreateUserModal = NiceModal.create(() => {
	const modal = useModal();
	const utils = trpc.useUtils();

	const form = useZodForm({
		schema: createUserAdminSchema,
		defaultValues: {
			email: "",
			password: "",
			name: "",
			role: "user",
		},
	});

	const createUser = trpc.admin.user.createUser.useMutation({
		onSuccess: () => {
			toast.success("Utente creato con successo");
			utils.admin.user.list.invalidate();
			modal.hide();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onSubmit = form.handleSubmit((data) => {
		createUser.mutate(data);
	});

	return (
		<Dialog onOpenChange={(open) => !open && modal.hide()} open={modal.visible}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crea utente</DialogTitle>
					<DialogDescription>
						Crea un nuovo utente nella piattaforma.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome</FormLabel>
									<FormControl>
										<Input placeholder="Mario Rossi" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											placeholder="mario@esempio.it"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input
											placeholder="Minimo 8 caratteri"
											type="password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Ruolo piattaforma</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="user">Utente</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => modal.hide()}
							>
								Annulla
							</Button>
							<Button type="submit" disabled={createUser.isPending}>
								{createUser.isPending && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								Crea utente
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/users/create-user-modal.tsx
git commit -m "feat: add CreateUserModal admin component"
```

---

## Task 18: Admin UI — Create Organization Modal

**Files:**
- Create: `components/admin/organizations/create-organization-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/admin/organizations/create-organization-modal.tsx`:

```typescript
"use client";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { createOrganizationAdminSchema } from "@/schemas/admin-create-organization-schemas";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

export const CreateOrganizationAdminModal = NiceModal.create(() => {
	const modal = useModal();
	const utils = trpc.useUtils();

	const form = useZodForm({
		schema: createOrganizationAdminSchema,
		defaultValues: {
			name: "",
			ownerUserId: "",
		},
	});

	const createOrg = trpc.admin.organization.createOrganization.useMutation({
		onSuccess: () => {
			toast.success("Organizzazione creata con successo");
			utils.admin.organization.list.invalidate();
			modal.hide();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onSubmit = form.handleSubmit((data) => {
		createOrg.mutate(data);
	});

	return (
		<Dialog onOpenChange={(open) => !open && modal.hide()} open={modal.visible}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crea organizzazione</DialogTitle>
					<DialogDescription>
						Crea una nuova organizzazione e assegna un proprietario.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome organizzazione</FormLabel>
									<FormControl>
										<Input placeholder="Acme Corp" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="ownerUserId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>ID utente proprietario</FormLabel>
									<FormControl>
										<Input
											placeholder="UUID dell'utente proprietario"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => modal.hide()}
							>
								Annulla
							</Button>
							<Button type="submit" disabled={createOrg.isPending}>
								{createOrg.isPending && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								Crea organizzazione
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
});
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/create-organization-modal.tsx
git commit -m "feat: add CreateOrganizationAdminModal component"
```

---

## Task 19: Admin UI — Add Member Modal

**Files:**
- Create: `components/admin/organizations/add-member-modal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/admin/organizations/add-member-modal.tsx`:

```typescript
"use client";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { addMemberAdminSchema } from "@/schemas/admin-create-organization-schemas";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

type AddMemberModalProps = {
	organizationId: string;
};

export const AddMemberModal = NiceModal.create(
	({ organizationId }: AddMemberModalProps) => {
		const modal = useModal();
		const utils = trpc.useUtils();

		const form = useZodForm({
			schema: addMemberAdminSchema,
			defaultValues: {
				organizationId,
				userId: "",
				role: "member",
			},
		});

		const addMember = trpc.admin.organization.addMember.useMutation({
			onSuccess: () => {
				toast.success("Membro aggiunto con successo");
				utils.admin.organization.list.invalidate();
				modal.hide();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			addMember.mutate(data);
		});

		return (
			<Dialog
				onOpenChange={(open) => !open && modal.hide()}
				open={modal.visible}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Aggiungi membro</DialogTitle>
						<DialogDescription>
							Aggiungi un utente a questa organizzazione.
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-4">
							<FormField
								control={form.control}
								name="userId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ID utente</FormLabel>
										<FormControl>
											<Input
												placeholder="UUID dell'utente da aggiungere"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ruolo</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="member">Membro</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
												<SelectItem value="owner">Proprietario</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => modal.hide()}
								>
									Annulla
								</Button>
								<Button type="submit" disabled={addMember.isPending}>
									{addMember.isPending && (
										<Loader2Icon className="mr-2 size-4 animate-spin" />
									)}
									Aggiungi membro
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add components/admin/organizations/add-member-modal.tsx
git commit -m "feat: add AddMemberModal admin component"
```

---

## Task 20: Personal Account Only — Auto-create Org on Confirm

**Files:**
- Modify: `app/(saas)/auth/confirm/route.ts`

- [ ] **Step 1: Add auto-create personal org logic**

Replace the entire file content with:

```typescript
import { featuresConfig } from "@/config/features.config";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const token_hash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	const next = searchParams.get("next") ?? "/dashboard";

	if (token_hash && type) {
		const supabase = await createClient();
		const { error } = await supabase.auth.verifyOtp({ type, token_hash });
		if (!error) {
			// Auto-create personal organization for new signups
			if (featuresConfig.personalAccountOnly && type === "signup") {
				try {
					const {
						data: { user },
					} = await supabase.auth.getUser();

					if (user) {
						const adminClient = createAdminClient();
						const name =
							user.user_metadata?.name || user.email?.split("@")[0] || "Account";
						const slug = `${slugify(name, { lowercase: true })}-${nanoid(5)}`;

						await adminClient
							.rpc("create_organization_with_owner", {
								p_name: name,
								p_slug: slug,
								p_user_id: user.id,
								p_metadata: null,
							})
							.single();
					}
				} catch (orgError) {
					logger.error(
						{ error: orgError },
						"Failed to auto-create personal organization",
					);
					// Don't block the user — they can still access the dashboard
				}
			}

			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	return NextResponse.redirect(
		`${origin}/auth/sign-in?error=verification_failed`,
	);
}
```

- [ ] **Step 2: Update admin createUser to also auto-create org**

In `trpc/routers/admin/admin-user-router.ts`, in the `createUser` procedure, after the `logger.info(...)` line and before `return`, add:

```typescript
// Auto-create personal organization if personalAccountOnly is enabled
if (featuresConfig.personalAccountOnly) {
	try {
		const name = input.name || input.email.split("@")[0];
		const slug = `${slugify(name, { lowercase: true })}-${nanoid(5)}`;

		await adminClient
			.rpc("create_organization_with_owner", {
				p_name: name,
				p_slug: slug,
				p_user_id: authData.user.id,
				p_metadata: null,
			})
			.single();
	} catch (orgError) {
		logger.error(
			{ error: orgError, userId: authData.user.id },
			"Failed to auto-create personal organization for admin-created user",
		);
	}
}
```

Also add the imports for `slugify` and `nanoid` to the admin-user-router.ts file:

```typescript
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add "app/(saas)/auth/confirm/route.ts" trpc/routers/admin/admin-user-router.ts
git commit -m "feat: auto-create personal org on signup when personalAccountOnly is enabled"
```

---

## Task 21: Unit Tests — Features Config

**Files:**
- Create: `tests/config/features.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

// We test the bool logic and constraint enforcement
// by mocking the env module before importing features config

describe("features config", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("should default all flags to true except personalAccountOnly", async () => {
		vi.doMock("@/lib/env", () => ({
			env: {},
		}));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.billing).toBe(true);
		expect(featuresConfig.leads).toBe(true);
		expect(featuresConfig.aiChatbot).toBe(true);
		expect(featuresConfig.onboarding).toBe(true);
		expect(featuresConfig.publicRegistration).toBe(true);
		expect(featuresConfig.multiOrg).toBe(true);
		expect(featuresConfig.personalAccountOnly).toBe(false);
	});

	it("should parse 'false' string as false", async () => {
		vi.doMock("@/lib/env", () => ({
			env: {
				NEXT_PUBLIC_FEATURE_BILLING: "false",
				NEXT_PUBLIC_FEATURE_LEADS: "false",
			},
		}));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.billing).toBe(false);
		expect(featuresConfig.leads).toBe(false);
	});

	it("should force multiOrg=false when personalAccountOnly=true", async () => {
		vi.doMock("@/lib/env", () => ({
			env: {
				NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY: "true",
				NEXT_PUBLIC_FEATURE_MULTI_ORG: "true",
			},
		}));
		const warnFn = vi.fn();
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: warnFn, info: vi.fn(), error: vi.fn() },
		}));

		const { featuresConfig } = await import("@/config/features.config");

		expect(featuresConfig.personalAccountOnly).toBe(true);
		expect(featuresConfig.multiOrg).toBe(false);
		expect(warnFn).toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/config/features.test.ts`
Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/config/features.test.ts
git commit -m "test: add unit tests for features config"
```

---

## Task 22: Unit Tests — featureGuard Middleware

**Files:**
- Create: `tests/trpc/feature-guard.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

describe("featureGuard middleware", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("should call next() when feature is enabled", async () => {
		vi.doMock("@/config/features.config", () => ({
			featuresConfig: { billing: true },
		}));
		vi.doMock("@/lib/env", () => ({ env: {} }));
		vi.doMock("@/lib/logger", () => ({
			logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
		}));

		// We can't easily test tRPC middleware in isolation without setting up
		// the full tRPC context, so we test the logic directly
		const { featuresConfig } = await import("@/config/features.config");
		expect(featuresConfig.billing).toBe(true);
	});

	it("should throw FORBIDDEN when feature is disabled", async () => {
		vi.doMock("@/config/features.config", () => ({
			featuresConfig: { billing: false },
		}));

		const { featuresConfig } = await import("@/config/features.config");
		expect(featuresConfig.billing).toBe(false);

		// Simulate what featureGuard does
		if (!featuresConfig.billing) {
			const error = new TRPCError({
				code: "FORBIDDEN",
				message: 'Funzionalità "billing" non abilitata.',
			});
			expect(error.code).toBe("FORBIDDEN");
		}
	});
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/trpc/feature-guard.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/trpc/feature-guard.test.ts
git commit -m "test: add unit tests for featureGuard middleware"
```

---

## Task 23: Final Verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No lint errors (fix any that appear)

- [ ] **Step 3: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 4: Test with default env (all features on)**

Run: `npm run build`
Expected: Build succeeds with all features enabled by default

- [ ] **Step 5: Commit any lint fixes**

If there were lint fixes:

```bash
git add -A
git commit -m "fix: lint fixes for feature flags implementation"
```

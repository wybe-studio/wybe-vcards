# Notification Bell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a notification bell icon with popover to the dashboard top bar, showing pending organization invitations in real-time via Supabase Realtime.

**Architecture:** Standalone `NotificationBell` client component that queries a new `notification.listMyInvitations` tRPC endpoint. It subscribes to Supabase Realtime on the `invitation` table filtered by user email, invalidating the tRPC cache on changes. The bell is rendered inside `PagePrimaryBar` on every dashboard page.

**Tech Stack:** tRPC, Supabase Realtime, Shadcn Popover, Lucide React (`Bell` icon), Tailwind CSS 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `trpc/routers/notification-router.ts` | Create | tRPC router with `listMyInvitations` query |
| `trpc/routers/app.ts` | Modify | Register notification router |
| `components/notifications/notification-bell.tsx` | Create | Bell icon + badge + popover + realtime subscription |
| `components/ui/custom/page.tsx` | Modify | Add optional `actions` slot to `PagePrimaryBar` |
| 10 page files using `PagePrimaryBar` | Modify | Pass `<NotificationBell />` to the new slot |

---

### Task 1: Create the notification tRPC router

**Files:**
- Create: `trpc/routers/notification-router.ts`
- Modify: `trpc/routers/app.ts`

- [ ] **Step 1: Create `trpc/routers/notification-router.ts`**

```typescript
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

/**
 * Notification router — currently handles organization invitations only.
 * To add new notification types: add a new query procedure per type,
 * or extend listMyInvitations to return a union of notification shapes.
 * Consider extracting to a NotificationProvider if types exceed 2-3.
 */
export const notificationRouter = createTRPCRouter({
	listMyInvitations: protectedProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("invitation")
			.select("id, email, role, status, created_at, expires_at, organization:organization(id, name, logo)")
			.eq("email", ctx.user.email)
			.eq("status", "pending")
			.order("created_at", { ascending: false });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile recuperare gli inviti",
			});
		}

		return data ?? [];
	}),
});
```

- [ ] **Step 2: Register the router in `trpc/routers/app.ts`**

Add `notification` to the router. The file currently looks like:

```typescript
import { lazy } from "@trpc/server";
import { createTRPCRouter } from "@/trpc/init";

export const appRouter = createTRPCRouter({
	admin: lazy(() => import("./admin")),
	contact: lazy(() => import("./contact")),
	notification: lazy(() => import("./notification-router").then(m => ({ default: m.notificationRouter }))),
	organization: lazy(() => import("./organization")),
	user: lazy(() => import("./user")),
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors related to `notification` router.

- [ ] **Step 4: Commit**

```bash
git add trpc/routers/notification-router.ts trpc/routers/app.ts
git commit -m "feat: add notification tRPC router with listMyInvitations"
```

---

### Task 2: Add `actions` slot to `PagePrimaryBar`

**Files:**
- Modify: `components/ui/custom/page.tsx` (lines 44-65)

- [ ] **Step 1: Extend `PagePrimaryBar` to accept an optional `actions` prop**

Currently `PagePrimaryBar` renders `SidebarTrigger` + separator + a `div` with `justify-between` for its children. Add an `actions` prop rendered in the right side.

Change the `PagePrimaryBar` component in `components/ui/custom/page.tsx`:

```typescript
export type PagePrimaryBarProps = React.ComponentProps<"div"> & {
	actions?: React.ReactNode;
};
function PagePrimaryBar({
	className,
	children,
	actions,
	...other
}: PagePrimaryBarProps): React.JSX.Element {
	return (
		<div
			className={cn(
				"relative flex h-14 flex-row items-center gap-1 border-border/50 border-b px-4 sm:px-6",
				className,
			)}
			{...other}
		>
			<SidebarTrigger />
			<Separator className="mr-2 h-4!" orientation="vertical" />
			<div className="flex w-full flex-row items-center justify-between">
				{children}
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors. All existing usages of `PagePrimaryBar` without `actions` still work (optional prop).

- [ ] **Step 3: Commit**

```bash
git add components/ui/custom/page.tsx
git commit -m "feat: add optional actions slot to PagePrimaryBar"
```

---

### Task 3: Create the `NotificationBell` component

**Files:**
- Create: `components/notifications/notification-bell.tsx`

- [ ] **Step 1: Create `components/notifications/notification-bell.tsx`**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";
import { useSession } from "@/hooks/use-session";

/**
 * Notification bell — currently handles organization invitations only.
 * To add new notification types: add a fetch hook, a realtime subscription,
 * and a render case in the notification list. Consider extracting to a
 * NotificationProvider if types exceed 2-3.
 */
export function NotificationBell() {
	const router = useRouter();
	const { user } = useSession();
	const utils = trpc.useUtils();

	const { data: invitations = [] } = trpc.notification.listMyInvitations.useQuery(
		undefined,
		{ enabled: !!user },
	);

	const count = invitations.length;

	// Supabase Realtime subscription for invitation changes
	useEffect(() => {
		if (!user?.email) return;

		const supabase = createClient();
		const channel = supabase
			.channel("invitation-notifications")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "invitation",
					filter: `email=eq.${user.email}`,
				},
				() => {
					utils.notification.listMyInvitations.invalidate();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [user?.email, utils]);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative h-8 w-8">
					<Bell className="h-4 w-4" />
					{count > 0 && (
						<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground animate-in zoom-in-50">
							{count}
						</span>
					)}
					<span className="sr-only">Notifiche</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="border-b px-4 py-3">
					<p className="text-sm font-medium">Notifiche</p>
				</div>
				{count === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
						<Bell className="mb-2 h-8 w-8 opacity-40" />
						<p className="text-sm">Nessuna notifica</p>
					</div>
				) : (
					<ScrollArea className="max-h-72">
						<div className="divide-y">
							{invitations.map((invitation) => (
								<NotificationInvitationItem
									key={invitation.id}
									invitation={invitation}
									onClick={() => {
										router.push(
											`/dashboard/organization-invitation/${invitation.id}`,
										);
									}}
								/>
							))}
						</div>
					</ScrollArea>
				)}
			</PopoverContent>
		</Popover>
	);
}

const roleLabels: Record<string, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Membro",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function resolveStorageUrl(path: string | null): string | null {
	if (!path) return null;
	if (path.startsWith("http")) return path;
	return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

function NotificationInvitationItem({
	invitation,
	onClick,
}: {
	invitation: {
		id: string;
		role: string;
		created_at: string;
		organization: { id: string; name: string; logo: string | null } | null;
	};
	onClick: () => void;
}) {
	const timeAgo = useMemo(() => {
		return formatTimeAgo(invitation.created_at);
	}, [invitation.created_at]);

	const orgName = invitation.organization?.name ?? "Organizzazione";
	const logoUrl = resolveStorageUrl(invitation.organization?.logo ?? null);

	return (
		<button
			type="button"
			className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
			onClick={onClick}
		>
			{logoUrl ? (
				<img
					src={logoUrl}
					alt={orgName}
					className="h-8 w-8 shrink-0 rounded-full object-cover"
				/>
			) : (
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
					{orgName.charAt(0).toUpperCase()}
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">
					Invito da {orgName}
				</p>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="rounded bg-muted px-1.5 py-0.5">
						{roleLabels[invitation.role] ?? invitation.role}
					</span>
					<span>{timeAgo}</span>
				</div>
			</div>
		</button>
	);
}

function formatTimeAgo(dateString: string): string {
	const now = new Date();
	const date = new Date(dateString);
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60_000);

	if (diffMin < 1) return "Adesso";
	if (diffMin < 60) return `${diffMin} min fa`;

	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "ora" : "ore"} fa`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "giorno" : "giorni"} fa`;

	return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
```

**Note about `useStorage`:** The hook at `hooks/use-storage.tsx` takes `(image: string | null, fallback?: string)` and returns a resolved URL string. It cannot be called conditionally per-item in a list. Instead, use the inline URL resolution helper directly in `NotificationInvitationItem` (see the `resolveStorageUrl` helper below).

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors. Pay attention to the `invitation.organization` type — the Supabase join returns `{ id, name, logo } | null`.

- [ ] **Step 3: Commit**

```bash
git add components/notifications/notification-bell.tsx
git commit -m "feat: create NotificationBell component with realtime"
```

---

### Task 4: Mount `NotificationBell` in all dashboard pages

**Files:**
- Modify: All page files that use `PagePrimaryBar`

These are the pages that need the bell. Each one follows the same pattern: add `actions={<NotificationBell />}` to `PagePrimaryBar`. Since pages are Server Components, wrap the bell in its own client boundary (it's already `"use client"`).

The pages to modify are:

1. `app/(saas)/dashboard/(sidebar)/(home)/page.tsx`
2. `app/(saas)/dashboard/(sidebar)/(home)/settings/page.tsx`
3. `app/(saas)/dashboard/(sidebar)/organization/page.tsx`
4. `app/(saas)/dashboard/(sidebar)/organization/vcards/page.tsx`
5. `app/(saas)/dashboard/(sidebar)/organization/physical-cards/page.tsx`
6. `app/(saas)/dashboard/(sidebar)/organization/leads/page.tsx`
7. `app/(saas)/dashboard/(sidebar)/organization/chatbot/page.tsx`
8. `app/(saas)/dashboard/(sidebar)/organization/settings/page.tsx`
9. `app/(saas)/dashboard/(sidebar)/admin/organizations/page.tsx`
10. `app/(saas)/dashboard/(sidebar)/admin/organizations/[organizationId]/page.tsx`
11. `app/(saas)/dashboard/(sidebar)/admin/users/page.tsx`
12. `app/(saas)/dashboard/(sidebar)/admin/app-config/page.tsx`

- [ ] **Step 1: Update each page file**

For each page, add the import and the `actions` prop. Example for `app/(saas)/dashboard/(sidebar)/(home)/page.tsx`:

Before:
```tsx
<PagePrimaryBar>
	<PageBreadcrumb segments={[{ label: "Home" }]} />
</PagePrimaryBar>
```

After:
```tsx
import { NotificationBell } from "@/components/notifications/notification-bell";

// ... in the JSX:
<PagePrimaryBar actions={<NotificationBell />}>
	<PageBreadcrumb segments={[{ label: "Home" }]} />
</PagePrimaryBar>
```

Apply this same change to all 12 pages listed above. Each page already imports from `@/components/ui/custom/page` — just add the `NotificationBell` import and the `actions` prop.

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors across all modified pages.

- [ ] **Step 3: Verify lint passes**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(saas\)/dashboard/
git commit -m "feat: mount NotificationBell in all dashboard pages"
```

---

### Task 5: Enable Supabase Realtime on the `invitation` table

**Files:**
- Create: `supabase/migrations/<timestamp>_enable_realtime_invitation.sql`

Supabase Realtime requires the table to be added to the `supabase_realtime` publication.

- [ ] **Step 1: Create migration**

Run: `npx supabase migration new enable_realtime_invitation`

This creates a timestamped file. Write the following content:

```sql
-- Enable Realtime on the invitation table for notification bell
alter publication supabase_realtime add table public.invitation;
```

- [ ] **Step 2: Apply migration locally**

Run: `npm run db:reset`
Expected: Migration applies without errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: enable Supabase Realtime on invitation table"
```

---

### Task 6: Manual QA verification

No automated tests for this feature — it's a UI component with realtime integration best verified manually.

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify bell appears on dashboard pages**

Navigate to:
- `/dashboard` — bell should appear in top bar, right side
- `/dashboard/organization` — bell should appear
- `/dashboard/organization/settings` — bell should appear

- [ ] **Step 3: Verify empty state**

With no pending invitations, open the popover. Should show "Nessuna notifica" with a bell icon.

- [ ] **Step 4: Verify with pending invitation**

Create an invitation via the org settings members tab (or via Supabase Studio). The bell badge should appear in real-time without page refresh.

- [ ] **Step 5: Verify click navigation**

Click on an invitation in the popover. Should navigate to `/dashboard/organization-invitation/[id]`.

- [ ] **Step 6: Verify realtime updates**

Accept or reject the invitation. The bell badge count should update automatically.

- [ ] **Step 7: Final checks**

Run: `npm run lint && npm run typecheck`
Expected: All pass.

- [ ] **Step 8: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: notification bell QA fixes"
```

# Notification Bell — Design Spec

## Overview

Add a notification bell icon with popover to the dashboard top bar, showing pending organization invitations in real-time. Currently invitations are only accessible via email links — this gives users an in-app way to discover and act on pending invitations.

## Decisions

| Decision | Choice |
|----------|--------|
| Placement | `PagePrimaryBar`, right side (after breadcrumb) |
| Pattern | Generic notification system, first type: org invitations |
| Popover content | Only pending invitations (no history) |
| Click behavior | Navigate to existing `/dashboard/organization-invitation/[id]` page |
| Data freshness | Supabase Realtime subscription |
| Architecture | Standalone component (Approach A) |
| Future extensibility | Comment in code documenting extension pattern |

## Components

### `components/notifications/notification-bell.tsx`

Standalone component that handles fetch, realtime subscription, and rendering.

```
// Notification system — currently handles organization invitations only.
// To add new notification types: add a fetch function, a realtime subscription,
// and a render case in the notification list. Consider extracting to a
// NotificationProvider if types exceed 2-3.
```

**Structure:**
- `Bell` icon (Lucide) with red numeric badge overlay
- Shadcn `Popover` opening on click
- List of pending invitations
- Empty state when no notifications

### Integration in `PagePrimaryBar`

The `PagePrimaryBar` in `components/ui/custom/page.tsx` is extended with an optional right-side slot. The `NotificationBell` is mounted there, appearing on every dashboard page.

## Backend

### New router: `trpc/routers/notification-router.ts`

Dedicated notification router, registered in the root router.

### Endpoint: `notification.listMyInvitations`

- **Procedure:** `protectedProcedure` (user-level, not org-level)
- **Query:** `invitation` table filtered by `email = current user email` AND `status = 'pending'`
- **Join:** `organization` table for name and logo
- **Order:** `created_at DESC`
- **RLS:** Already covered by existing policy ("users can read invitations addressed to their email")

No separate notifications table — uses the `invitation` table directly as source of truth.

## Realtime

Client-side Supabase Realtime subscription inside `NotificationBell`:

- **Channel:** `invitation` table with filter `email=eq.{userEmail}`
- **Events:** `INSERT` (new invite), `UPDATE` (accepted/rejected/canceled), `DELETE` (expired/removed by cron)
- **Action:** On any event, call `utils.notification.listMyInvitations.invalidate()` to refetch

## UI Details

### Popover

- Width: ~320px fixed, max-height with scroll
- Header: "Notifiche"
- Each invitation item shows:
  - Organization logo (if present) + organization name
  - Role badge ("Membro", "Admin", "Owner")
  - Relative time ("2 ore fa", "3 giorni fa")
  - Hover highlight for clickability
- Click navigates to `/dashboard/organization-invitation/[id]`
- Empty state: subtle icon + "Nessuna notifica"

### Badge

- Red circle with count overlaid on Bell icon
- Hidden when count = 0
- Subtle scale animation on new invitation arrival

### Responsiveness

- On mobile, popover becomes full-width with lateral margins
- Icon stays in same position in `PagePrimaryBar`

## Edge Cases

### Expired invitations
- Hourly cron job deletes expired pending invitations
- Realtime catches `DELETE` event, list updates automatically
- If user clicks a just-expired invite, the detail page already handles this (shows error)

### Post-acceptance flow
- After accepting on the detail page, user is redirected to dashboard (existing behavior)
- Realtime catches `UPDATE` of status, count decreases automatically

### Performance
- Single lightweight query (pending invites by email, typically 0-2 results)
- Filtered realtime channel, minimal overhead
- No polling

## Files to Create/Modify

| File | Action |
|------|--------|
| `components/notifications/notification-bell.tsx` | Create — main component |
| `trpc/routers/notification-router.ts` | Create — notification tRPC router |
| `trpc/routers/index.ts` | Modify — register notification router |
| `components/ui/custom/page.tsx` | Modify — add notification slot to `PagePrimaryBar` |
| Page files using `PagePrimaryBar` | Modify — add `NotificationBell` to the right-side slot alongside existing `PageActions` |

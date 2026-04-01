"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

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

	const { data: invitations = [] } =
		trpc.notification.listMyInvitations.useQuery(undefined, {
			enabled: !!user,
		});

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
				<p className="truncate text-sm font-medium">Invito da {orgName}</p>
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
	if (diffHours < 24)
		return `${diffHours} ${diffHours === 1 ? "ora" : "ore"} fa`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7)
		return `${diffDays} ${diffDays === 1 ? "giorno" : "giorni"} fa`;

	return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

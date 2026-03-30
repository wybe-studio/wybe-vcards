"use client";

import { Badge } from "@/components/ui/badge";

type SubscriptionStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "canceled"
	| "incomplete"
	| "incomplete_expired"
	| "unpaid"
	| "paused";

interface SubscriptionStatusBadgeProps {
	status: string;
	className?: string;
}

const statusConfig: Record<
	SubscriptionStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	active: { label: "Attivo", variant: "default" },
	trialing: { label: "Prova", variant: "secondary" },
	past_due: { label: "Scaduto", variant: "destructive" },
	canceled: { label: "Cancellato", variant: "outline" },
	incomplete: { label: "Incompleto", variant: "outline" },
	incomplete_expired: { label: "Scaduto", variant: "destructive" },
	unpaid: { label: "Non pagato", variant: "destructive" },
	paused: { label: "In pausa", variant: "secondary" },
};

export function SubscriptionStatusBadge({
	status,
	className,
}: SubscriptionStatusBadgeProps) {
	const normalized = (
		status in statusConfig ? status : "active"
	) as SubscriptionStatus;
	const config = statusConfig[normalized];

	return (
		<Badge
			variant={status in statusConfig ? config.variant : "outline"}
			className={className}
		>
			{status in statusConfig ? config.label : status}
		</Badge>
	);
}

import { Badge } from "@/components/ui/badge";
import type { PhysicalCardStatus } from "@/lib/enums";

const statusConfig: Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	free: { label: "Libera", variant: "outline" },
	assigned: { label: "Assegnata", variant: "default" },
	disabled: { label: "Disattivata", variant: "destructive" },
};

export function PhysicalCardStatusBadge({
	status,
}: {
	status: PhysicalCardStatus;
}): React.JSX.Element {
	const config = statusConfig[status] ?? {
		label: status,
		variant: "outline" as const,
	};
	return <Badge variant={config.variant}>{config.label}</Badge>;
}

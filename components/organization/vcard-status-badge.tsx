import { Badge } from "@/components/ui/badge";
import type { VcardStatus } from "@/lib/enums";

const statusConfig: Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	active: { label: "Attiva", variant: "default" },
	suspended: { label: "Sospesa", variant: "secondary" },
	archived: { label: "Archiviata", variant: "destructive" },
};

export function VcardStatusBadge({
	status,
}: {
	status: VcardStatus;
}): React.JSX.Element {
	const config = statusConfig[status] ?? {
		label: status,
		variant: "outline" as const,
	};
	return <Badge variant={config.variant}>{config.label}</Badge>;
}

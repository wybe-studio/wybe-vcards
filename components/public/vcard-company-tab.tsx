"use client";

import {
	BuildingIcon,
	CopyIcon,
	GlobeIcon,
	MailIcon,
	MapPinIcon,
	PhoneIcon,
} from "lucide-react";
import { toast } from "sonner";

interface VcardCompanyTabProps {
	companyName?: string | null;
	phone?: string | null;
	email?: string | null;
	website?: string | null;
	address?: string | null;
	pec?: string | null;
}

function CompanyRow({
	icon: Icon,
	label,
	value,
	href,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	href?: string;
}) {
	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		toast.success("Copiato negli appunti");
	};

	const content = (
		<>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<Icon className="h-5 w-5 text-primary" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm font-medium">{value}</p>
			</div>
		</>
	);

	return (
		<div className="flex items-center gap-3 rounded-lg border bg-card p-3">
			{href ? (
				<a href={href} className="flex flex-1 items-center gap-3">
					{content}
				</a>
			) : (
				<div className="flex flex-1 items-center gap-3">{content}</div>
			)}
			<button
				type="button"
				onClick={handleCopy}
				className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
			>
				<CopyIcon className="h-4 w-4" />
			</button>
		</div>
	);
}

export function VcardCompanyTab({
	companyName,
	phone,
	email,
	website,
	address,
	pec,
}: VcardCompanyTabProps) {
	const rows = [
		...(companyName
			? [{ icon: BuildingIcon, label: "Ragione sociale", value: companyName }]
			: []),
		...(phone
			? [
					{
						icon: PhoneIcon,
						label: "Telefono",
						value: phone,
						href: `tel:${phone}`,
					},
				]
			: []),
		...(email
			? [
					{
						icon: MailIcon,
						label: "Email",
						value: email,
						href: `mailto:${email}`,
					},
				]
			: []),
		...(pec
			? [{ icon: MailIcon, label: "PEC", value: pec, href: `mailto:${pec}` }]
			: []),
		...(website
			? [{ icon: GlobeIcon, label: "Sito web", value: website, href: website }]
			: []),
		...(address
			? [{ icon: MapPinIcon, label: "Indirizzo", value: address }]
			: []),
	];

	if (rows.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				Nessun dato aziendale disponibile.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{rows.map((row) => (
				<CompanyRow key={row.label} {...row} />
			))}
		</div>
	);
}

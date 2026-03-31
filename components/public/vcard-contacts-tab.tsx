"use client";

import { CopyIcon, LinkedinIcon, MailIcon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";

interface VcardContactsTabProps {
	email?: string | null;
	phone?: string | null;
	phoneSecondary?: string | null;
	linkedinUrl?: string | null;
}

function ContactRow({
	icon: Icon,
	label,
	value,
	href,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	href: string;
}) {
	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		toast.success("Copiato negli appunti");
	};

	return (
		<div className="flex items-center gap-3 rounded-lg border bg-card p-3">
			<a href={href} className="flex flex-1 items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<Icon className="h-5 w-5 text-primary" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-xs text-muted-foreground">{label}</p>
					<p className="truncate text-sm font-medium">{value}</p>
				</div>
			</a>
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

export function VcardContactsTab({
	email,
	phone,
	phoneSecondary,
	linkedinUrl,
}: VcardContactsTabProps) {
	const contacts = [
		...(phone
			? [
					{
						icon: PhoneIcon,
						label: "Cellulare",
						value: phone,
						href: `tel:${phone}`,
					},
				]
			: []),
		...(phoneSecondary
			? [
					{
						icon: PhoneIcon,
						label: "Telefono",
						value: phoneSecondary,
						href: `tel:${phoneSecondary}`,
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
		...(linkedinUrl
			? [
					{
						icon: LinkedinIcon,
						label: "LinkedIn",
						value: "Profilo LinkedIn",
						href: linkedinUrl,
					},
				]
			: []),
	];

	if (contacts.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				Nessun contatto disponibile.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{contacts.map((contact) => (
				<ContactRow key={contact.label + contact.value} {...contact} />
			))}
		</div>
	);
}

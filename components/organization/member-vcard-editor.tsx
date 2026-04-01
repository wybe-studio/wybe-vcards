"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import * as React from "react";
import { VcardModal } from "@/components/organization/vcard-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import type { VcardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

export function MemberVcardEditor(): React.JSX.Element {
	const { data: organization } = useActiveOrganization();

	const { data, isPending } = trpc.organization.vcard.list.useQuery(
		{
			limit: 1,
			offset: 0,
			query: "",
			sortBy: "created_at",
			sortOrder: "desc",
		},
		{ placeholderData: (prev: any) => prev },
	);

	const vcard = data?.data?.[0] as
		| {
				id: string;
				organization_id: string;
				first_name: string;
				last_name: string;
				slug: string;
				job_title: string | null;
				email: string | null;
				phone: string | null;
				phone_secondary: string | null;
				linkedin_url: string | null;
				profile_image: string | null;
				status: string;
				user_id: string | null;
				created_at: string;
				updated_at: string;
		  }
		| undefined;

	const handleEdit = React.useCallback(() => {
		if (!vcard || !organization?.id) return;
		NiceModal.show(VcardModal, {
			organizationId: organization.id,
			vcard: {
				id: vcard.id,
				firstName: vcard.first_name,
				lastName: vcard.last_name,
				slug: vcard.slug,
				jobTitle: vcard.job_title,
				email: vcard.email,
				phone: vcard.phone,
				phoneSecondary: vcard.phone_secondary,
				linkedinUrl: vcard.linkedin_url,
				profileImage: vcard.profile_image,
				status: vcard.status,
				userId: vcard.user_id,
			},
		});
	}, [vcard, organization?.id]);

	// Auto-open edit modal on first load
	const hasAutoOpened = React.useRef(false);
	React.useEffect(() => {
		if (vcard && organization?.id && !hasAutoOpened.current) {
			hasAutoOpened.current = true;
			handleEdit();
		}
	}, [vcard, organization?.id, handleEdit]);

	if (isPending) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-6">
						<Skeleton className="size-20 rounded-full" />
						<div className="space-y-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-48" />
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!vcard) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>La tua vCard</CardTitle>
					<CardDescription>
						Non hai ancora una vCard assegnata. Contatta un amministratore
						dell&apos;organizzazione per richiederne una.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const fullName = `${vcard.first_name} ${vcard.last_name}`;

	return (
		<Card>
			<CardHeader className="flex-row items-start justify-between gap-4">
				<div>
					<CardTitle>La tua vCard</CardTitle>
					<CardDescription>
						Visualizza e modifica le informazioni della tua vCard personale.
					</CardDescription>
				</div>
				<div className="flex gap-2">
					{organization?.slug && (
						<Button variant="outline" size="sm" asChild>
							<a
								href={`/${organization.slug}/${vcard.slug}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLinkIcon className="size-4" />
								Anteprima
							</a>
						</Button>
					)}
					<Button size="sm" onClick={handleEdit}>
						<PencilIcon className="size-4" />
						Modifica
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-start gap-6">
					<UserAvatar
						className="size-20 shrink-0 text-lg"
						name={fullName}
						src={vcard.profile_image}
					/>
					<div className="min-w-0 space-y-1">
						<div className="flex items-center gap-3">
							<h3 className="font-semibold text-lg">{fullName}</h3>
							<VcardStatusBadge status={vcard.status as VcardStatus} />
						</div>
						{vcard.job_title && (
							<p className="text-muted-foreground">{vcard.job_title}</p>
						)}
						{vcard.email && (
							<p className="text-muted-foreground text-sm">{vcard.email}</p>
						)}
						{vcard.phone && (
							<p className="text-muted-foreground text-sm">{vcard.phone}</p>
						)}
						{vcard.phone_secondary && (
							<p className="text-muted-foreground text-sm">
								{vcard.phone_secondary}
							</p>
						)}
						{vcard.linkedin_url && (
							<p className="truncate text-muted-foreground text-sm">
								{vcard.linkedin_url}
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

"use client";

import NiceModal from "@ebay/nice-modal-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
	IdCardIcon,
	MailIcon,
	NfcIcon,
	PencilIcon,
	PhoneIcon,
	PlusIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { VcardModal } from "@/components/organization/vcard-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CenteredSpinner } from "@/components/ui/custom/centered-spinner";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/user/user-avatar";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useStorage } from "@/hooks/use-storage";
import type { VcardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

export function OrganizationDashboard() {
	const { data: stats, isPending } = trpc.organization.vcard.stats.useQuery();

	if (isPending) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center py-24">
				<CenteredSpinner size="large" />
			</div>
		);
	}

	if (!stats) return null;

	const vcardUsagePercent =
		stats.vcards.max > 0
			? Math.round((stats.vcards.total / stats.vcards.max) * 100)
			: 0;

	const totalPhysicalCards =
		stats.physicalCards.free +
		stats.physicalCards.assigned +
		stats.physicalCards.disabled;

	return (
		<div className="fade-in flex animate-in flex-col gap-8 duration-500">
			{/* La mia vCard - solo per membri non-admin */}
			{!stats.isAdmin && <MyVcardSection />}

			{/* KPI Metrics — borderless, lightweight */}
			<div
				className={`grid grid-cols-1 divide-y md:divide-x md:divide-y-0 ${stats.isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}
			>
				{/* vCard */}
				<div className="py-4 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<IdCardIcon className="size-4" />
						<span>vCard</span>
					</div>
					<div className="mt-1 font-bold text-3xl tracking-tight">
						{stats.vcards.active}
						<span className="ml-1.5 font-normal text-muted-foreground text-sm">
							attive
						</span>
					</div>
					<div className="mt-3 flex items-center gap-2">
						<Progress value={vcardUsagePercent} className="h-1.5" />
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{stats.vcards.total}/{stats.vcards.max}
						</span>
					</div>
					{(stats.vcards.suspended > 0 || stats.vcards.archived > 0) && (
						<div className="mt-1.5 flex gap-2 text-muted-foreground text-xs">
							{stats.vcards.suspended > 0 && (
								<span>{stats.vcards.suspended} sospese</span>
							)}
							{stats.vcards.archived > 0 && (
								<span>{stats.vcards.archived} archiviate</span>
							)}
						</div>
					)}
				</div>

				{/* Card fisiche - solo admin */}
				{stats.isAdmin && (
					<div className="py-4 md:px-6 md:py-0">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<NfcIcon className="size-4" />
							<span>Card fisiche</span>
						</div>
						<div className="mt-1 font-bold text-3xl tracking-tight">
							{totalPhysicalCards}
							<span className="ml-1.5 font-normal text-muted-foreground text-sm">
								totali
							</span>
						</div>
						<div className="mt-3 flex flex-wrap gap-1.5">
							<Badge variant="outline" className="text-xs">
								{stats.physicalCards.free} libere
							</Badge>
							<Badge variant="secondary" className="text-xs">
								{stats.physicalCards.assigned} assegnate
							</Badge>
							{stats.physicalCards.disabled > 0 && (
								<Badge variant="destructive" className="text-xs">
									{stats.physicalCards.disabled} disattivate
								</Badge>
							)}
						</div>
					</div>
				)}

				{/* Membri */}
				<div className="py-4 md:px-6 md:py-0 md:last:pr-0">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<UsersIcon className="size-4" />
						<span>Membri</span>
					</div>
					<div className="mt-1 font-bold text-3xl tracking-tight">
						{stats.members}
					</div>
					<p className="mt-1.5 text-muted-foreground text-xs">
						nell'organizzazione
					</p>
				</div>
			</div>

			{/* Ultime vCard — primary content, full width */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-base tracking-tight">
							Ultime vCard create
						</h2>
						<p className="mt-0.5 text-muted-foreground text-sm">
							Le vCard più recenti dell'organizzazione
						</p>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href="/dashboard/organization/vcards">Vedi tutte</Link>
					</Button>
				</div>
				{stats.recentVcards.length === 0 ? (
					<Empty className="border py-12">
						<EmptyHeader>
							<IdCardIcon className="size-10 text-muted-foreground/40" />
							<EmptyTitle>Nessuna vCard creata</EmptyTitle>
						</EmptyHeader>
						{stats.isAdmin && (
							<Button asChild variant="outline" size="sm">
								<Link href="/dashboard/organization/vcards">
									<PlusIcon className="mr-1.5 size-4" />
									Crea la prima vCard
								</Link>
							</Button>
						)}
					</Empty>
				) : (
					<div className="divide-y rounded-lg border">
						{stats.recentVcards.map((vcard) => (
							<div
								key={vcard.id}
								className="flex items-center justify-between px-4 py-3"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">
										{vcard.first_name} {vcard.last_name}
									</p>
									{vcard.job_title && (
										<p className="truncate text-muted-foreground text-xs">
											{vcard.job_title}
										</p>
									)}
								</div>
								<div className="flex items-center gap-3">
									<VcardStatusBadge status={vcard.status as VcardStatus} />
									<span className="text-muted-foreground text-xs whitespace-nowrap">
										{format(new Date(vcard.created_at), "d MMM", {
											locale: it,
										})}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function MyVcardSection() {
	const { data: organization } = useActiveOrganization();
	const { data, isPending } = trpc.organization.vcard.list.useQuery({
		limit: 10,
		offset: 0,
		sortBy: "created_at",
		sortOrder: "desc",
	});

	if (isPending) return null;

	const vcards = data?.data ?? [];

	if (vcards.length === 0) {
		return (
			<Empty className="border py-12">
				<EmptyHeader>
					<IdCardIcon className="size-10 text-muted-foreground/40" />
					<EmptyTitle>Nessuna vCard assegnata</EmptyTitle>
					<EmptyDescription>
						Contatta un amministratore per richiedere la tua vCard.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="font-semibold text-lg tracking-tight">
				{vcards.length === 1 ? "La mia vCard" : "Le mie vCard"}
			</h2>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{vcards.map((vc) => (
					<MyVcardCard
						key={vc.id}
						vcard={vc}
						organizationId={organization?.id ?? ""}
					/>
				))}
			</div>
		</div>
	);
}

function MyVcardCard({
	vcard,
	organizationId,
}: {
	organizationId: string;
	vcard: {
		id: string;
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
	};
}) {
	const fullName = `${vcard.first_name} ${vcard.last_name}`;
	const profileImageUrl = useStorage(vcard.profile_image);

	return (
		<Card>
			<CardContent className="flex items-start gap-4 pt-6">
				<UserAvatar
					className="size-14 shrink-0"
					name={fullName}
					src={profileImageUrl}
				/>
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex items-center gap-2">
						<h3 className="truncate font-semibold">{fullName}</h3>
						<VcardStatusBadge status={vcard.status as VcardStatus} />
					</div>
					{vcard.job_title && (
						<p className="truncate text-muted-foreground text-sm">
							{vcard.job_title}
						</p>
					)}
					{vcard.email && (
						<p className="flex items-center gap-1.5 truncate text-muted-foreground text-sm">
							<MailIcon className="size-3.5 shrink-0" />
							{vcard.email}
						</p>
					)}
					{vcard.phone && (
						<p className="flex items-center gap-1.5 truncate text-muted-foreground text-sm">
							<PhoneIcon className="size-3.5 shrink-0" />
							{vcard.phone}
						</p>
					)}
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						NiceModal.show(VcardModal, {
							organizationId,
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
					}}
				>
					<PencilIcon className="mr-1.5 size-3.5" />
					Modifica
				</Button>
			</CardContent>
		</Card>
	);
}

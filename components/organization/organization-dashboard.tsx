"use client";

import NiceModal from "@ebay/nice-modal-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
	CreditCardIcon,
	IdCardIcon,
	MailIcon,
	NfcIcon,
	PencilIcon,
	PhoneIcon,
	PlusIcon,
	SettingsIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { VcardModal } from "@/components/organization/vcard-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CenteredSpinner } from "@/components/ui/custom/centered-spinner";
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
		<div className="fade-in flex animate-in flex-col space-y-6 duration-500">
			{/* La mia vCard - solo per membri non-admin */}
			{!stats.isAdmin && <MyVcardSection />}

			{/* KPI Cards */}
			<div
				className={`grid grid-cols-1 gap-4 ${stats.isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}
			>
				{/* vCard */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">vCard</CardTitle>
						<IdCardIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{stats.vcards.active}{" "}
							<span className="font-normal text-muted-foreground text-sm">
								attive
							</span>
						</div>
						<div className="mt-2 flex items-center gap-2">
							<Progress value={vcardUsagePercent} className="h-2" />
							<span className="text-muted-foreground text-xs whitespace-nowrap">
								{stats.vcards.total} / {stats.vcards.max}
							</span>
						</div>
						{(stats.vcards.suspended > 0 || stats.vcards.archived > 0) && (
							<div className="mt-2 flex gap-2 text-muted-foreground text-xs">
								{stats.vcards.suspended > 0 && (
									<span>{stats.vcards.suspended} sospese</span>
								)}
								{stats.vcards.archived > 0 && (
									<span>{stats.vcards.archived} archiviate</span>
								)}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Card fisiche - solo admin */}
				{stats.isAdmin && (
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Card fisiche
							</CardTitle>
							<NfcIcon className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{totalPhysicalCards}{" "}
								<span className="font-normal text-muted-foreground text-sm">
									totali
								</span>
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
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
						</CardContent>
					</Card>
				)}

				{/* Membri */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Membri</CardTitle>
						<UsersIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.members}</div>
						<p className="mt-1 text-muted-foreground text-xs">
							membri nell'organizzazione
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Ultime vCard */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Ultime vCard create</CardTitle>
						<CardDescription>
							Le vCard più recenti dell'organizzazione
						</CardDescription>
					</CardHeader>
					<CardContent>
						{stats.recentVcards.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<IdCardIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
								<p className="text-muted-foreground text-sm">
									Nessuna vCard creata
								</p>
								{stats.isAdmin && (
									<Button asChild variant="outline" size="sm" className="mt-3">
										<Link href="/dashboard/organization/vcards">
											<PlusIcon className="mr-2 h-4 w-4" />
											Crea la prima vCard
										</Link>
									</Button>
								)}
							</div>
						) : (
							<div className="space-y-3">
								{stats.recentVcards.map((vcard) => (
									<div
										key={vcard.id}
										className="flex items-center justify-between rounded-lg border p-3"
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
								<Button
									asChild
									variant="ghost"
									size="sm"
									className="mt-2 w-full"
								>
									<Link href="/dashboard/organization/vcards">
										Vedi tutte le vCard
									</Link>
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Azioni rapide */}
				<Card>
					<CardHeader>
						<CardTitle>Azioni rapide</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{stats.isAdmin && (
							<>
								<Button asChild variant="outline" className="justify-start">
									<Link href="/dashboard/organization/vcards">
										<IdCardIcon className="mr-2 h-4 w-4" />
										Gestisci vCard
									</Link>
								</Button>
								<Button asChild variant="outline" className="justify-start">
									<Link href="/dashboard/organization/physical-cards">
										<CreditCardIcon className="mr-2 h-4 w-4" />
										Card fisiche
									</Link>
								</Button>
								<Button asChild variant="outline" className="justify-start">
									<Link href="/dashboard/organization/settings?tab=members">
										<UsersIcon className="mr-2 h-4 w-4" />
										Gestisci membri
									</Link>
								</Button>
								<Button asChild variant="outline" className="justify-start">
									<Link href="/dashboard/organization/settings?tab=style">
										<SettingsIcon className="mr-2 h-4 w-4" />
										Personalizza stile
									</Link>
								</Button>
							</>
						)}
						{!stats.isAdmin && (
							<Button asChild variant="outline" className="justify-start">
								<Link href="/dashboard/organization/vcards">
									<IdCardIcon className="mr-2 h-4 w-4" />
									Le mie vCard
								</Link>
							</Button>
						)}
					</CardContent>
				</Card>
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
			<Card>
				<CardHeader>
					<CardTitle>La mia vCard</CardTitle>
					<CardDescription>
						Non hai ancora una vCard assegnata al tuo account.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-6 text-center">
						<IdCardIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							Contatta un amministratore per richiedere la tua vCard.
						</p>
					</div>
				</CardContent>
			</Card>
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

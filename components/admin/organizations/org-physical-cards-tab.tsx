"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	BanIcon,
	CheckCircleIcon,
	LinkIcon,
	PlusIcon,
	UnlinkIcon,
} from "lucide-react";
import * as React from "react";
import { AdminAssignCardModal } from "@/components/admin/organizations/admin-assign-card-modal";
import { GenerateCardsModal } from "@/components/admin/organizations/generate-cards-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { PhysicalCardStatusBadge } from "@/components/organization/physical-card-status-badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PhysicalCardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

interface OrgPhysicalCardsTabProps {
	organizationId: string;
	maxPhysicalCards: number;
}

interface AdminPhysicalCard {
	id: string;
	code: string;
	status: string;
	created_at: string;
	vcard: {
		id: string;
		first_name: string;
		last_name: string;
	} | null;
}

export function OrgPhysicalCardsTab({
	organizationId,
	maxPhysicalCards,
}: OrgPhysicalCardsTabProps): React.JSX.Element {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const utils = trpc.useUtils();

	const { data, isPending } =
		trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
			organizationId,
			limit: pageSize,
			offset: pageIndex * pageSize,
			query: searchQuery || undefined,
		});

	const remaining = maxPhysicalCards - (data?.total ?? 0);

	const unassignMutation = trpc.admin.physicalCard.unassign.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({
				organizationId,
			});
		},
	});

	const disableMutation = trpc.admin.physicalCard.disable.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({
				organizationId,
			});
		},
	});

	const enableMutation = trpc.admin.physicalCard.enable.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgPhysicalCards.invalidate({
				organizationId,
			});
		},
	});

	const columns: ColumnDef<AdminPhysicalCard>[] = [
		{
			accessorKey: "code",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Codice" />
			),
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.original.code}</span>
			),
		},
		{
			accessorKey: "status",
			header: "Stato",
			cell: ({ row }) => (
				<PhysicalCardStatusBadge
					status={row.original.status as PhysicalCardStatus}
				/>
			),
		},
		{
			accessorKey: "vcard",
			header: "vCard collegata",
			cell: ({ row }) =>
				row.original.vcard
					? `${row.original.vcard.first_name} ${row.original.vcard.last_name}`
					: "—",
		},
		{
			accessorKey: "created_at",
			header: "Creata",
			cell: ({ row }) =>
				format(new Date(row.original.created_at), "dd MMM, yyyy"),
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			cell: ({ row }) => {
				const card = row.original;
				return (
					<div className="flex items-center justify-end gap-1">
						{card.status === "free" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(AdminAssignCardModal, {
												organizationId,
												cardId: card.id,
												cardCode: card.code,
											});
										}}
									>
										<LinkIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Assegna a vCard</TooltipContent>
							</Tooltip>
						)}

						{card.status === "assigned" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Scollegare la card?",
												message: `La card ${card.code} verra scollegata dalla vCard di ${card.vcard?.first_name} ${card.vcard?.last_name}.`,
												confirmLabel: "Scollega",
												onConfirm: async () => {
													await unassignMutation.mutateAsync({
														organizationId,
														cardId: card.id,
													});
												},
											});
										}}
									>
										<UnlinkIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Scollega</TooltipContent>
							</Tooltip>
						)}

						{card.status !== "disabled" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-destructive"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Disattivare la card?",
												message: `La card ${card.code} verra disattivata${card.vcard ? ` e scollegata dalla vCard di ${card.vcard.first_name} ${card.vcard.last_name}` : ""}.`,
												confirmLabel: "Disattiva",
												destructive: true,
												onConfirm: async () => {
													await disableMutation.mutateAsync({
														organizationId,
														cardId: card.id,
													});
												},
											});
										}}
									>
										<BanIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Disattiva</TooltipContent>
							</Tooltip>
						)}

						{card.status === "disabled" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() =>
											enableMutation.mutate({
												organizationId,
												cardId: card.id,
											})
										}
									>
										<CheckCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Riattiva</TooltipContent>
							</Tooltip>
						)}
					</div>
				);
			},
		},
	];

	return (
		<DataTable
			columns={columns}
			data={(data?.data as unknown as AdminPhysicalCard[]) ?? []}
			emptyMessage="Nessuna card fisica trovata"
			enablePagination
			enableSearch
			loading={isPending}
			onPageIndexChange={setPageIndex}
			onSearchQueryChange={setSearchQuery}
			pageIndex={pageIndex}
			pageSize={pageSize}
			searchPlaceholder="Cerca per codice..."
			searchQuery={searchQuery}
			toolbarActions={
				<Button
					onClick={() =>
						NiceModal.show(GenerateCardsModal, {
							organizationId,
							remaining: Math.max(0, remaining),
						})
					}
					size="sm"
				>
					<PlusIcon className="mr-2 size-4" />
					Genera card fisiche
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}

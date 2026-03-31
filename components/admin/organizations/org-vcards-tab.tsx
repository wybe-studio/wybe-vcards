"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ArchiveIcon,
	PauseCircleIcon,
	PencilIcon,
	PlayCircleIcon,
	Trash2Icon,
} from "lucide-react";
import * as React from "react";
import { AdminEditVcardModal } from "@/components/admin/organizations/admin-edit-vcard-modal";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
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
import type { VcardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

interface OrgVcardsTabProps {
	organizationId: string;
}

interface AdminVcard {
	id: string;
	first_name: string;
	last_name: string;
	slug: string;
	email: string | null;
	phone: string | null;
	job_title: string | null;
	status: string;
	created_at: string;
}

export function OrgVcardsTab({
	organizationId,
}: OrgVcardsTabProps): React.JSX.Element {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const utils = trpc.useUtils();

	const { data, isLoading } = trpc.admin.physicalCard.listOrgVcards.useQuery({
		organizationId,
		limit: pageSize,
		offset: pageIndex * pageSize,
		query: searchQuery || undefined,
	});

	const updateMutation = trpc.admin.vcard.update.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
		},
	});

	const deleteMutation = trpc.admin.vcard.delete.useMutation({
		onSuccess: () => {
			utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
		},
	});

	const handleStatusChange = (
		vcardId: string,
		newStatus: "active" | "suspended" | "archived",
	) => {
		updateMutation.mutate({ organizationId, vcardId, status: newStatus });
	};

	const columns: ColumnDef<AdminVcard>[] = [
		{
			accessorKey: "first_name",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Nome" />
			),
			cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => row.original.email ?? "—",
		},
		{
			accessorKey: "job_title",
			header: "Ruolo",
			cell: ({ row }) => row.original.job_title ?? "—",
		},
		{
			accessorKey: "status",
			header: "Stato",
			cell: ({ row }) => (
				<VcardStatusBadge status={row.original.status as VcardStatus} />
			),
		},
		{
			accessorKey: "slug",
			header: "Slug",
			cell: ({ row }) => (
				<span className="font-mono text-muted-foreground text-xs">
					{row.original.slug}
				</span>
			),
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
				const vcard = row.original;
				return (
					<div className="flex items-center justify-end gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="size-8 text-muted-foreground"
									onClick={() => {
										NiceModal.show(AdminEditVcardModal, {
											organizationId,
											vcard,
										});
									}}
								>
									<PencilIcon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Modifica</TooltipContent>
						</Tooltip>

						{vcard.status === "active" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Sospendere la vCard?",
												message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra sospesa e non sara piu visibile pubblicamente.`,
												confirmLabel: "Sospendi",
												onConfirm: () =>
													handleStatusChange(vcard.id, "suspended"),
											});
										}}
									>
										<PauseCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Sospendi</TooltipContent>
							</Tooltip>
						)}

						{vcard.status === "suspended" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => handleStatusChange(vcard.id, "active")}
									>
										<PlayCircleIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Riattiva</TooltipContent>
							</Tooltip>
						)}

						{vcard.status !== "archived" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										className="size-8 text-muted-foreground"
										onClick={() => {
											NiceModal.show(ConfirmationModal, {
												title: "Archiviare la vCard?",
												message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra archiviata.`,
												confirmLabel: "Archivia",
												onConfirm: () =>
													handleStatusChange(vcard.id, "archived"),
											});
										}}
									>
										<ArchiveIcon className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Archivia</TooltipContent>
							</Tooltip>
						)}

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									className="size-8 text-destructive"
									onClick={() => {
										NiceModal.show(ConfirmationModal, {
											title: "Eliminare la vCard?",
											message: `La vCard di ${vcard.first_name} ${vcard.last_name} verra eliminata permanentemente. Le card fisiche collegate verranno scollegate.`,
											confirmLabel: "Elimina",
											destructive: true,
											onConfirm: () => {
												deleteMutation.mutateAsync({
													organizationId,
													vcardId: vcard.id,
												});
											},
										});
									}}
								>
									<Trash2Icon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Elimina</TooltipContent>
						</Tooltip>
					</div>
				);
			},
		},
	];

	return (
		<DataTable
			columns={columns}
			data={(data?.data ?? []) as unknown as AdminVcard[]}
			emptyMessage="Nessuna vCard trovata"
			enablePagination
			enableSearch
			loading={isLoading}
			onPageIndexChange={setPageIndex}
			onSearchQueryChange={setSearchQuery}
			pageIndex={pageIndex}
			pageSize={pageSize}
			searchPlaceholder="Cerca per nome o email..."
			searchQuery={searchQuery}
			totalCount={data?.total ?? 0}
		/>
	);
}

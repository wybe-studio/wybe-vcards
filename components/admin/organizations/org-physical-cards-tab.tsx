"use client";

import NiceModal from "@ebay/nice-modal-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { PlusIcon } from "lucide-react";
import * as React from "react";
import { GenerateCardsModal } from "@/components/admin/organizations/generate-cards-modal";
import { PhysicalCardStatusBadge } from "@/components/organization/physical-card-status-badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
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
}: OrgPhysicalCardsTabProps) {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const { data, isPending } =
		trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
			organizationId,
			limit: pageSize,
			offset: pageIndex * pageSize,
			query: searchQuery || undefined,
		});

	const remaining = maxPhysicalCards - (data?.total ?? 0);

	const columns: ColumnDef<AdminPhysicalCard>[] = [
		{
			accessorKey: "code",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Codice" />
			),
			cell: ({ row }) => (
				<span className="font-mono font-medium">{row.original.code}</span>
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
			cell: ({ row }) => {
				const vc = row.original.vcard;
				if (!vc) return <span className="text-muted-foreground">—</span>;
				return (
					<span className="text-foreground/80">
						{vc.first_name} {vc.last_name}
					</span>
				);
			},
		},
		{
			accessorKey: "created_at",
			header: "Creata",
			cell: ({ row }) => (
				<span className="text-foreground/80">
					{format(new Date(row.original.created_at), "dd MMM, yyyy")}
				</span>
			),
		},
	];

	return (
		<DataTable
			columns={columns}
			data={(data?.data as unknown as AdminPhysicalCard[]) || []}
			emptyMessage="Nessuna card fisica in questa organizzazione."
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
					size="sm"
					onClick={() =>
						NiceModal.show(GenerateCardsModal, {
							organizationId,
							remaining: Math.max(0, remaining),
						})
					}
				>
					<PlusIcon className="size-4 shrink-0" />
					Genera card fisiche
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}

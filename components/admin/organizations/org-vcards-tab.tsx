"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import * as React from "react";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
import {
	DataTable,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
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
	job_title: string | null;
	status: string;
	created_at: string;
}

export function OrgVcardsTab({ organizationId }: OrgVcardsTabProps) {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [searchQuery, setSearchQuery] = React.useState("");
	const pageSize = 25;

	const { data, isPending } = trpc.admin.physicalCard.listOrgVcards.useQuery({
		organizationId,
		limit: pageSize,
		offset: pageIndex * pageSize,
		query: searchQuery || undefined,
	});

	const columns: ColumnDef<AdminVcard>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Nome" />
			),
			cell: ({ row }) => (
				<span className="font-medium">
					{row.original.first_name} {row.original.last_name}
				</span>
			),
		},
		{
			accessorKey: "email",
			header: "Email",
			cell: ({ row }) => (
				<span className="text-foreground/80">{row.original.email || "—"}</span>
			),
		},
		{
			accessorKey: "job_title",
			header: "Ruolo",
			cell: ({ row }) => (
				<span className="text-foreground/80">
					{row.original.job_title || "—"}
				</span>
			),
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
				<span className="font-mono text-xs text-foreground/60">
					{row.original.slug}
				</span>
			),
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
			data={(data?.data as unknown as AdminVcard[]) || []}
			emptyMessage="Nessuna vCard in questa organizzazione."
			enablePagination
			enableSearch
			loading={isPending}
			onPageIndexChange={setPageIndex}
			onSearchQueryChange={setSearchQuery}
			pageIndex={pageIndex}
			pageSize={pageSize}
			searchPlaceholder="Cerca vCard..."
			searchQuery={searchQuery}
			totalCount={data?.total ?? 0}
		/>
	);
}

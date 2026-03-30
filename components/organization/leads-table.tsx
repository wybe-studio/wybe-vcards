"use client";

import NiceModal from "@ebay/nice-modal-react";
import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryState,
} from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { LeadsBulkActions } from "@/components/organization/leads-bulk-actions";
import { LeadsModal } from "@/components/organization/leads-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	createSelectionColumn,
	DataTable,
	type FilterConfig,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user/user-avatar";
import { LeadSource, LeadStatus } from "@/lib/enums";
import { capitalize, cn } from "@/lib/utils";
import { LeadSortField } from "@/schemas/organization-lead-schemas";
import { trpc } from "@/trpc/client";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: false }];

interface Lead {
	id: string;
	organization_id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone: string | null;
	company: string | null;
	job_title: string | null;
	status: string;
	source: string;
	estimated_value: number | null;
	notes: string | null;
	assigned_to_id: string | null;
	created_at: string;
	updated_at: string;
}

const statusLabels: Record<string, string> = {
	new: "Nuovo",
	contacted: "Contattato",
	qualified: "Qualificato",
	proposal: "Proposta",
	negotiation: "Negoziazione",
	won: "Vinto",
	lost: "Perso",
};

const statusColors: Record<string, string> = {
	new: "bg-blue-100 dark:bg-blue-900",
	contacted: "bg-yellow-100 dark:bg-yellow-900",
	qualified: "bg-purple-100 dark:bg-purple-900",
	proposal: "bg-orange-100 dark:bg-orange-900",
	negotiation: "bg-cyan-100 dark:bg-cyan-900",
	won: "bg-green-100 dark:bg-green-900",
	lost: "bg-red-100 dark:bg-red-900",
};

const sourceLabels: Record<string, string> = {
	website: "Sito web",
	referral: "Referral",
	social_media: "Social media",
	advertising: "Pubblicit\u00E0",
	cold_call: "Chiamata a freddo",
	email: "Email",
	event: "Evento",
	other: "Altro",
};

export function LeadsTable(): React.JSX.Element {
	const [rowSelection, setRowSelection] = React.useState({});

	const [searchQuery, setSearchQuery] = useQueryState(
		"query",
		parseAsString.withDefault("").withOptions({
			shallow: true,
		}),
	);

	const [pageIndex, setPageIndex] = useQueryState(
		"pageIndex",
		parseAsInteger.withDefault(0).withOptions({
			shallow: true,
		}),
	);

	const [pageSize, setPageSize] = useQueryState(
		"pageSize",
		parseAsInteger.withDefault(DEFAULT_PAGE_SIZE).withOptions({
			shallow: true,
		}),
	);

	const [statusFilter, setStatusFilter] = useQueryState(
		"status",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions({
			shallow: true,
		}),
	);

	const [sourceFilter, setSourceFilter] = useQueryState(
		"source",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions({
			shallow: true,
		}),
	);

	const [createdAtFilter, setCreatedAtFilter] = useQueryState(
		"createdAt",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions({
			shallow: true,
		}),
	);

	const [sorting, setSorting] = useQueryState<SortingState>(
		"sort",
		parseAsJson<SortingState>((value) => {
			if (!Array.isArray(value)) return DEFAULT_SORTING;
			return value.filter(
				(item) =>
					item &&
					typeof item === "object" &&
					"id" in item &&
					typeof item.desc === "boolean",
			) as SortingState;
		})
			.withDefault(DEFAULT_SORTING)
			.withOptions({ shallow: true }),
	);

	const utils = trpc.useUtils();

	// Build columnFilters from URL state
	const columnFilters: ColumnFiltersState = React.useMemo(() => {
		const filters: ColumnFiltersState = [];
		if (statusFilter && statusFilter.length > 0) {
			filters.push({ id: "status", value: statusFilter });
		}
		if (sourceFilter && sourceFilter.length > 0) {
			filters.push({ id: "source", value: sourceFilter });
		}
		if (createdAtFilter && createdAtFilter.length > 0) {
			filters.push({ id: "createdAt", value: createdAtFilter });
		}
		return filters;
	}, [statusFilter, sourceFilter, createdAtFilter]);

	const handleFiltersChange = (filters: ColumnFiltersState): void => {
		const getFilterValue = (id: string): string[] => {
			const filter = filters.find((f) => f.id === id);
			return Array.isArray(filter?.value) ? (filter.value as string[]) : [];
		};

		setStatusFilter(getFilterValue("status"));
		setSourceFilter(getFilterValue("source"));
		setCreatedAtFilter(getFilterValue("createdAt"));

		if (pageIndex !== 0) {
			setPageIndex(0);
		}
	};

	const handleSortingChange = (newSorting: SortingState): void => {
		// When clearing sort, fall back to default to keep URL and state consistent
		setSorting(newSorting.length > 0 ? newSorting : DEFAULT_SORTING);
		if (pageIndex !== 0) {
			setPageIndex(0);
		}
	};

	// Build sort params from sorting state
	const sortParams = React.useMemo(() => {
		const fallbackSort = { id: "created_at", desc: false } as const;
		const currentSort = sorting?.[0] ?? DEFAULT_SORTING[0] ?? fallbackSort;
		const sortBy = LeadSortField.options.includes(
			currentSort.id as LeadSortField,
		)
			? (currentSort.id as LeadSortField)
			: "created_at";
		const sortOrder = currentSort.desc ? ("desc" as const) : ("asc" as const);
		return { sortBy, sortOrder };
	}, [sorting]);

	const { data, isPending } = trpc.organization.lead.list.useQuery(
		{
			limit: pageSize || DEFAULT_PAGE_SIZE,
			offset: (pageIndex || 0) * (pageSize || DEFAULT_PAGE_SIZE),
			query: searchQuery || "",
			sortBy: sortParams.sortBy,
			sortOrder: sortParams.sortOrder,
			filters: {
				status: (statusFilter || []) as (
					| "new"
					| "contacted"
					| "qualified"
					| "proposal"
					| "negotiation"
					| "won"
					| "lost"
				)[],
				source: (sourceFilter || []) as (
					| "website"
					| "referral"
					| "social_media"
					| "advertising"
					| "cold_call"
					| "email"
					| "event"
					| "other"
				)[],
				createdAt: (createdAtFilter || []) as (
					| "today"
					| "this-week"
					| "this-month"
					| "older"
				)[],
			},
		},
		{
			placeholderData: (prev: any) => prev,
		},
	);

	const deleteLeadMutation = trpc.organization.lead.delete.useMutation({
		onSuccess: () => {
			toast.success("Lead eliminato con successo");
			utils.organization.lead.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile eliminare il lead");
		},
	});

	const handleSearchQueryChange = (value: string): void => {
		if (value !== searchQuery) {
			setSearchQuery(value);
			if (pageIndex !== 0) {
				setPageIndex(0);
			}
		}
	};

	const columns: ColumnDef<Lead>[] = [
		createSelectionColumn<Lead>(),
		{
			accessorKey: "name",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Nome" />
			),
			cell: ({ row }) => {
				const fullName = `${row.original.first_name} ${row.original.last_name}`;
				return (
					<div className="flex max-w-[200px] items-center gap-2">
						<UserAvatar className="size-6 shrink-0" name={fullName} />
						<span
							className="truncate font-medium text-foreground"
							title={fullName}
						>
							{fullName}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "company",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Azienda" />
			),
			cell: ({ row }) => (
				<span
					className="block max-w-[150px] truncate text-foreground/80"
					title={row.original.company || undefined}
				>
					{row.original.company || "-"}
				</span>
			),
		},
		{
			accessorKey: "email",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Email" />
			),
			cell: ({ row }) => (
				<span
					className="block max-w-[250px] truncate text-foreground/80"
					title={row.original.email}
				>
					{row.original.email}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Stato" />
			),
			cell: ({ row }) => (
				<Badge
					className={cn(
						"border-none px-2 py-0.5 font-medium text-foreground text-xs shadow-none",
						statusColors[row.original.status] || "bg-gray-100 dark:bg-gray-800",
					)}
					variant="outline"
				>
					{statusLabels[row.original.status] ||
						capitalize(row.original.status.replace("_", " "))}
				</Badge>
			),
		},
		{
			accessorKey: "source",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Fonte" />
			),
			cell: ({ row }) => (
				<span className="text-foreground/80">
					{sourceLabels[row.original.source] ||
						capitalize(row.original.source.replace("_", " "))}
				</span>
			),
		},
		{
			accessorKey: "estimated_value",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Valore" />
			),
			cell: ({ row }) => (
				<span className="text-foreground/80">
					{row.original.estimated_value
						? `$${row.original.estimated_value.toLocaleString()}`
						: "-"}
				</span>
			),
		},
		{
			accessorKey: "created_at",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Creato" />
			),
			cell: ({ row }) => (
				<span className="text-foreground/80">
					{format(new Date(row.original.created_at), "dd MMM, yyyy")}
				</span>
			),
		},
		{
			id: "actions",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
								size="icon"
								variant="ghost"
							>
								<MoreHorizontalIcon className="shrink-0" />
								<span className="sr-only">Apri menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => {
									const r = row.original;
									NiceModal.show(LeadsModal, {
										lead: {
											id: r.id,
											firstName: r.first_name,
											lastName: r.last_name,
											email: r.email,
											phone: r.phone,
											company: r.company,
											jobTitle: r.job_title,
											status: r.status,
											source: r.source,
											estimatedValue: r.estimated_value,
											notes: r.notes,
											assignedToId: r.assigned_to_id,
										},
									});
								}}
							>
								Modifica
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => {
									NiceModal.show(ConfirmationModal, {
										title: "Eliminare il lead?",
										message:
											"Sei sicuro di voler eliminare questo lead? Questa azione non pu\u00F2 essere annullata.",
										confirmLabel: "Elimina",
										destructive: true,
										onConfirm: () =>
											deleteLeadMutation.mutate({ id: row.original.id }),
									});
								}}
								variant="destructive"
							>
								Elimina
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
		},
	];

	const leadFilters: FilterConfig[] = [
		{
			key: "status",
			title: "Stato",
			options: Object.values(LeadStatus).map((status) => ({
				value: status,
				label: statusLabels[status] || capitalize(status.replace("_", " ")),
			})),
		},
		{
			key: "source",
			title: "Fonte",
			options: Object.values(LeadSource).map((source) => ({
				value: source,
				label: sourceLabels[source] || capitalize(source.replace("_", " ")),
			})),
		},
		{
			key: "createdAt",
			title: "Creato",
			options: [
				{ value: "today", label: "Oggi" },
				{ value: "this-week", label: "Questa settimana" },
				{ value: "this-month", label: "Questo mese" },
				{ value: "older", label: "Precedenti" },
			],
		},
	];

	return (
		<DataTable
			columnFilters={columnFilters}
			columns={columns}
			data={(data?.leads as unknown as Lead[]) || []}
			emptyMessage="Nessun lead trovato."
			enableFilters
			enablePagination
			enableRowSelection
			enableSearch
			filters={leadFilters}
			loading={isPending}
			onFiltersChange={handleFiltersChange}
			onPageIndexChange={setPageIndex}
			onPageSizeChange={setPageSize}
			onRowSelectionChange={setRowSelection}
			onSearchQueryChange={handleSearchQueryChange}
			onSortingChange={handleSortingChange}
			pageIndex={pageIndex || 0}
			pageSize={pageSize || DEFAULT_PAGE_SIZE}
			renderBulkActions={(table) => <LeadsBulkActions table={table} />}
			rowSelection={rowSelection}
			searchPlaceholder="Cerca lead..."
			searchQuery={searchQuery || ""}
			defaultSorting={DEFAULT_SORTING}
			sorting={sorting}
			toolbarActions={
				<Button onClick={() => NiceModal.show(LeadsModal)} size="sm">
					<PlusIcon className="size-4 shrink-0" />
					Aggiungi Lead
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}

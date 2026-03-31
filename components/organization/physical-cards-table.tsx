"use client";

import NiceModal from "@ebay/nice-modal-react";
import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	BanIcon,
	ExternalLinkIcon,
	LinkIcon,
	PowerIcon,
	UnlinkIcon,
} from "lucide-react";
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
import { PhysicalCardAssignModal } from "@/components/organization/physical-card-assign-modal";
import { PhysicalCardStatusBadge } from "@/components/organization/physical-card-status-badge";
import { Button } from "@/components/ui/button";
import {
	DataTable,
	type FilterConfig,
	SortableColumnHeader,
} from "@/components/ui/custom/data-table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { PhysicalCardStatus } from "@/lib/enums";
import { trpc } from "@/trpc/client";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORTING: SortingState = [{ id: "status", desc: true }];

interface PhysicalCard {
	id: string;
	organization_id: string;
	code: string;
	vcard_id: string | null;
	status: string;
	created_at: string;
	updated_at: string;
	vcard: {
		id: string;
		first_name: string;
		last_name: string;
		slug: string;
	} | null;
}

const statusLabels: Record<string, string> = {
	free: "Libera",
	assigned: "Assegnata",
	disabled: "Disattivata",
};

export function PhysicalCardsTable(): React.JSX.Element {
	const [searchQuery, setSearchQuery] = useQueryState(
		"query",
		parseAsString.withDefault("").withOptions({ shallow: true }),
	);

	const [pageIndex, setPageIndex] = useQueryState(
		"pageIndex",
		parseAsInteger.withDefault(0).withOptions({ shallow: true }),
	);

	const [pageSize, setPageSize] = useQueryState(
		"pageSize",
		parseAsInteger
			.withDefault(DEFAULT_PAGE_SIZE)
			.withOptions({ shallow: true }),
	);

	const [statusFilter, setStatusFilter] = useQueryState(
		"status",
		parseAsArrayOf(parseAsString)
			.withDefault([])
			.withOptions({ shallow: true }),
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

	const columnFilters: ColumnFiltersState = React.useMemo(() => {
		const filters: ColumnFiltersState = [];
		if (statusFilter && statusFilter.length > 0) {
			filters.push({ id: "status", value: statusFilter });
		}
		return filters;
	}, [statusFilter]);

	const handleFiltersChange = (filters: ColumnFiltersState): void => {
		const getFilterValue = (id: string): string[] => {
			const filter = filters.find((f) => f.id === id);
			return Array.isArray(filter?.value) ? (filter.value as string[]) : [];
		};
		setStatusFilter(getFilterValue("status"));
		if (pageIndex !== 0) setPageIndex(0);
	};

	const handleSortingChange = (newSorting: SortingState): void => {
		setSorting(newSorting.length > 0 ? newSorting : DEFAULT_SORTING);
		if (pageIndex !== 0) setPageIndex(0);
	};

	const sortParams = React.useMemo(() => {
		const fallbackSort = { id: "created_at", desc: true } as const;
		const currentSort = sorting?.[0] ?? DEFAULT_SORTING[0] ?? fallbackSort;
		const SORT_FIELDS = ["code", "status", "created_at"];
		const sortBy = SORT_FIELDS.includes(currentSort.id)
			? (currentSort.id as "code" | "status" | "created_at")
			: "created_at";
		const sortOrder = currentSort.desc ? ("desc" as const) : ("asc" as const);
		return { sortBy, sortOrder };
	}, [sorting]);

	const { data, isPending } = trpc.organization.physicalCard.list.useQuery(
		{
			limit: pageSize || DEFAULT_PAGE_SIZE,
			offset: (pageIndex || 0) * (pageSize || DEFAULT_PAGE_SIZE),
			query: searchQuery || "",
			sortBy: sortParams.sortBy,
			sortOrder: sortParams.sortOrder,
			filters: {
				status: (statusFilter || []) as ("free" | "assigned" | "disabled")[],
			},
		},
		{
			placeholderData: (prev: any) => prev,
		},
	);

	const unassignMutation = trpc.organization.physicalCard.unassign.useMutation({
		onSuccess: () => {
			toast.success("Card scollegata");
			utils.organization.physicalCard.list.invalidate();
			utils.organization.vcard.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile scollegare la card");
		},
	});

	const disableMutation = trpc.organization.physicalCard.disable.useMutation({
		onSuccess: () => {
			toast.success("Card disattivata");
			utils.organization.physicalCard.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile disattivare la card");
		},
	});

	const enableMutation = trpc.organization.physicalCard.enable.useMutation({
		onSuccess: () => {
			toast.success("Card riattivata");
			utils.organization.physicalCard.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile riattivare la card");
		},
	});

	const handleSearchQueryChange = (value: string): void => {
		if (value !== searchQuery) {
			setSearchQuery(value);
			if (pageIndex !== 0) setPageIndex(0);
		}
	};

	const columns: ColumnDef<PhysicalCard>[] = [
		{
			accessorKey: "code",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Codice" />
			),
			cell: ({ row }) => (
				<span className="font-mono font-medium text-foreground">
					{row.original.code}
				</span>
			),
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Stato" />
			),
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
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Creata" />
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
			cell: ({ row }) => {
				const card = row.original;
				return (
					<div className="flex justify-end gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="size-8 text-muted-foreground"
									size="icon"
									variant="ghost"
									asChild
								>
									<a
										href={`/code/${card.code}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLinkIcon className="size-4" />
										<span className="sr-only">Apri link card</span>
									</a>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Apri link card</TooltipContent>
						</Tooltip>
						{card.status === "free" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className="size-8 text-muted-foreground"
										size="icon"
										variant="ghost"
										onClick={() =>
											NiceModal.show(PhysicalCardAssignModal, {
												cardId: card.id,
												cardCode: card.code,
											})
										}
									>
										<LinkIcon className="size-4" />
										<span className="sr-only">Assegna</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Assegna</TooltipContent>
							</Tooltip>
						)}
						{card.status === "assigned" && (
							<>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="size-8 text-muted-foreground"
											size="icon"
											variant="ghost"
											onClick={() =>
												NiceModal.show(ConfirmationModal, {
													title: "Scollegare la card?",
													message:
														"La card tornera libera e potra essere riassegnata.",
													confirmLabel: "Scollega",
													onConfirm: () =>
														unassignMutation.mutate({ id: card.id }),
												})
											}
										>
											<UnlinkIcon className="size-4" />
											<span className="sr-only">Scollega</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent>Scollega</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="size-8 text-muted-foreground hover:text-destructive"
											size="icon"
											variant="ghost"
											onClick={() =>
												NiceModal.show(ConfirmationModal, {
													title: "Disattivare la card?",
													message:
														"La card verra disattivata e scollegata dalla vCard.",
													confirmLabel: "Disattiva",
													destructive: true,
													onConfirm: () =>
														disableMutation.mutate({ id: card.id }),
												})
											}
										>
											<BanIcon className="size-4" />
											<span className="sr-only">Disattiva</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent>Disattiva</TooltipContent>
								</Tooltip>
							</>
						)}
						{card.status === "disabled" && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className="size-8 text-muted-foreground"
										size="icon"
										variant="ghost"
										onClick={() => enableMutation.mutate({ id: card.id })}
									>
										<PowerIcon className="size-4" />
										<span className="sr-only">Riattiva</span>
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

	const cardFilters: FilterConfig[] = [
		{
			key: "status",
			title: "Stato",
			options: Object.values(PhysicalCardStatus).map((status) => ({
				value: status,
				label: statusLabels[status] || status,
			})),
		},
	];

	return (
		<DataTable
			columnFilters={columnFilters}
			columns={columns}
			data={(data?.data as unknown as PhysicalCard[]) || []}
			emptyMessage="Nessuna card fisica trovata."
			enableFilters
			enablePagination
			enableSearch
			filters={cardFilters}
			loading={isPending}
			onFiltersChange={handleFiltersChange}
			onPageIndexChange={setPageIndex}
			onPageSizeChange={setPageSize}
			onSearchQueryChange={handleSearchQueryChange}
			onSortingChange={handleSortingChange}
			pageIndex={pageIndex || 0}
			pageSize={pageSize || DEFAULT_PAGE_SIZE}
			searchPlaceholder="Cerca per codice o vCard..."
			searchQuery={searchQuery || ""}
			defaultSorting={DEFAULT_SORTING}
			sorting={sorting}
			totalCount={data?.total ?? 0}
		/>
	);
}

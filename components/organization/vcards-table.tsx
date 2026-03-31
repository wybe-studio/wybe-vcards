"use client";

import NiceModal from "@ebay/nice-modal-react";
import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	ExternalLinkIcon,
	NfcIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
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
import { VcardModal } from "@/components/organization/vcard-modal";
import { VcardStatusBadge } from "@/components/organization/vcard-status-badge";
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
import { UserAvatar } from "@/components/user/user-avatar";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { VcardStatus } from "@/lib/enums";
import type { VcardSortField } from "@/schemas/vcard-schemas";
import { trpc } from "@/trpc/client";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: true }];

const SORT_FIELDS = [
	"first_name",
	"last_name",
	"email",
	"status",
	"created_at",
];

interface PhysicalCardRef {
	id: string;
	code: string;
	status: string;
}

interface Vcard {
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
	physical_card: PhysicalCardRef[];
}

const statusLabels: Record<string, string> = {
	active: "Attiva",
	suspended: "Sospesa",
	archived: "Archiviata",
};

export function VcardsTable(): React.JSX.Element {
	const { data: organization } = useActiveOrganization();

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
		const sortBy = SORT_FIELDS.includes(currentSort.id)
			? (currentSort.id as VcardSortField)
			: "created_at";
		const sortOrder = currentSort.desc ? ("desc" as const) : ("asc" as const);
		return { sortBy, sortOrder };
	}, [sorting]);

	const { data, isPending } = trpc.organization.vcard.list.useQuery(
		{
			limit: pageSize || DEFAULT_PAGE_SIZE,
			offset: (pageIndex || 0) * (pageSize || DEFAULT_PAGE_SIZE),
			query: searchQuery || "",
			sortBy: sortParams.sortBy,
			sortOrder: sortParams.sortOrder,
			filters: {
				status: (statusFilter || []) as ("active" | "suspended" | "archived")[],
			},
		},
		{
			placeholderData: (prev: any) => prev,
		},
	);

	const deleteVcardMutation = trpc.organization.vcard.delete.useMutation({
		onSuccess: () => {
			toast.success("vCard eliminata con successo");
			utils.organization.vcard.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile eliminare la vCard");
		},
	});

	const handleSearchQueryChange = (value: string): void => {
		if (value !== searchQuery) {
			setSearchQuery(value);
			if (pageIndex !== 0) setPageIndex(0);
		}
	};

	const columns: ColumnDef<Vcard>[] = [
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
			accessorKey: "email",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Email" />
			),
			cell: ({ row }) => (
				<span
					className="block max-w-[250px] truncate text-foreground/80"
					title={row.original.email || undefined}
				>
					{row.original.email || "-"}
				</span>
			),
		},
		{
			accessorKey: "job_title",
			header: "Ruolo",
			cell: ({ row }) => (
				<span
					className="block max-w-[150px] truncate text-foreground/80"
					title={row.original.job_title || undefined}
				>
					{row.original.job_title || "-"}
				</span>
			),
		},
		{
			accessorKey: "physical_card",
			header: "Card fisica",
			enableSorting: false,
			cell: ({ row }) => {
				const cards = row.original.physical_card;
				const card = cards?.[0];
				if (!card) {
					return <span className="text-muted-foreground">—</span>;
				}
				return (
					<div className="flex items-center gap-1.5">
						<NfcIcon className="size-3.5 text-muted-foreground" />
						<span className="font-mono text-xs">{card.code}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Stato" />
			),
			cell: ({ row }) => (
				<VcardStatusBadge status={row.original.status as VcardStatus} />
			),
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
			cell: ({ row }) => (
				<div className="flex justify-end gap-1">
					{organization?.slug && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="size-8 text-muted-foreground"
									size="icon"
									variant="ghost"
									asChild
								>
									<a
										href={`/${organization.slug}/${row.original.slug}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<ExternalLinkIcon className="size-4" />
										<span className="sr-only">Apri pagina pubblica</span>
									</a>
								</Button>
							</TooltipTrigger>
							<TooltipContent>Apri pagina pubblica</TooltipContent>
						</Tooltip>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="size-8 text-muted-foreground"
								size="icon"
								variant="ghost"
								onClick={() => {
									const r = row.original;
									NiceModal.show(VcardModal, {
										vcard: {
											id: r.id,
											firstName: r.first_name,
											lastName: r.last_name,
											slug: r.slug,
											jobTitle: r.job_title,
											email: r.email,
											phone: r.phone,
											phoneSecondary: r.phone_secondary,
											linkedinUrl: r.linkedin_url,
											status: r.status,
											userId: r.user_id,
										},
									});
								}}
							>
								<PencilIcon className="size-4" />
								<span className="sr-only">Modifica</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>Modifica</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="size-8 text-muted-foreground hover:text-destructive"
								size="icon"
								variant="ghost"
								onClick={() => {
									NiceModal.show(ConfirmationModal, {
										title: "Eliminare la vCard?",
										message:
											"Sei sicuro di voler eliminare questa vCard? Questa azione non puo essere annullata.",
										confirmLabel: "Elimina",
										destructive: true,
										onConfirm: () =>
											deleteVcardMutation.mutate({ id: row.original.id }),
									});
								}}
							>
								<TrashIcon className="size-4" />
								<span className="sr-only">Elimina</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent>Elimina</TooltipContent>
					</Tooltip>
				</div>
			),
		},
	];

	const vcardFilters: FilterConfig[] = [
		{
			key: "status",
			title: "Stato",
			options: Object.values(VcardStatus).map((status) => ({
				value: status,
				label: statusLabels[status] || status,
			})),
		},
	];

	return (
		<DataTable
			columnFilters={columnFilters}
			columns={columns}
			data={(data?.data as unknown as Vcard[]) || []}
			emptyMessage="Nessuna vCard trovata."
			enableFilters
			enablePagination
			enableSearch
			filters={vcardFilters}
			loading={isPending}
			onFiltersChange={handleFiltersChange}
			onPageIndexChange={setPageIndex}
			onPageSizeChange={setPageSize}
			onSearchQueryChange={handleSearchQueryChange}
			onSortingChange={handleSortingChange}
			pageIndex={pageIndex || 0}
			pageSize={pageSize || DEFAULT_PAGE_SIZE}
			searchPlaceholder="Cerca vCard..."
			searchQuery={searchQuery || ""}
			defaultSorting={DEFAULT_SORTING}
			sorting={sorting}
			toolbarActions={
				<Button onClick={() => NiceModal.show(VcardModal)} size="sm">
					<PlusIcon className="size-4 shrink-0" />
					Aggiungi vCard
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}

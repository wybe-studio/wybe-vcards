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
import { AdjustCreditsModal } from "@/components/admin/organizations/adjust-credits-modal";
import { CreateOrganizationAdminModal } from "@/components/admin/organizations/create-organization-modal";
import { OrganizationBulkActions } from "@/components/admin/organizations/organization-bulk-actions";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { OrganizationLogo } from "@/components/organization/organization-logo";
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
import { appConfig } from "@/config/app.config";
import { OrganizationSortField } from "@/schemas/admin-organization-schemas";
import { trpc } from "@/trpc/client";

const DEFAULT_SORTING: SortingState = [{ id: "name", desc: false }];

type Organization = {
	id: string;
	name: string;
	logo: string | null;
	createdAt: string;
	metadata: string | null;
	membersCount: number;
	pendingInvites: number;
	subscriptionStatus: string | null;
	subscriptionPlan: string | null;
	subscriptionId: string | null;
	cancelAtPeriodEnd: boolean | null;
	trialEnd: string | null;
	credits: number | null;
};

export function OrganizationsTable(): React.JSX.Element {
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
		parseAsInteger.withDefault(appConfig.pagination.defaultLimit).withOptions({
			shallow: true,
		}),
	);

	const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useQueryState(
		"subscriptionStatus",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions({
			shallow: true,
		}),
	);

	const [balanceRangeFilter, setBalanceRangeFilter] = useQueryState(
		"balanceRange",
		parseAsArrayOf(parseAsString).withDefault([]).withOptions({
			shallow: true,
		}),
	);

	const [membersCountFilter, setMembersCountFilter] = useQueryState(
		"membersCount",
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

	const deleteOrganizationMutation =
		trpc.admin.organization.delete.useMutation();

	const cancelSubscriptionMutation =
		trpc.admin.organization.cancelSubscription.useMutation();

	const syncFromStripeMutation =
		trpc.admin.organization.syncFromStripe.useMutation();

	// Build columnFilters from URL state
	const columnFilters: ColumnFiltersState = React.useMemo(() => {
		const filters: ColumnFiltersState = [];
		if (membersCountFilter && membersCountFilter.length > 0) {
			filters.push({ id: "membersCount", value: membersCountFilter });
		}
		if (createdAtFilter && createdAtFilter.length > 0) {
			filters.push({ id: "createdAt", value: createdAtFilter });
		}
		if (subscriptionStatusFilter && subscriptionStatusFilter.length > 0) {
			filters.push({
				id: "subscriptionStatus",
				value: subscriptionStatusFilter,
			});
		}
		if (balanceRangeFilter && balanceRangeFilter.length > 0) {
			filters.push({ id: "credits", value: balanceRangeFilter });
		}
		return filters;
	}, [
		membersCountFilter,
		createdAtFilter,
		subscriptionStatusFilter,
		balanceRangeFilter,
	]);

	const handleFiltersChange = (filters: ColumnFiltersState): void => {
		const getFilterValue = (id: string): string[] => {
			const filter = filters.find((f) => f.id === id);
			return Array.isArray(filter?.value) ? (filter.value as string[]) : [];
		};

		setMembersCountFilter(getFilterValue("membersCount"));
		setCreatedAtFilter(getFilterValue("createdAt"));
		setSubscriptionStatusFilter(getFilterValue("subscriptionStatus"));
		setBalanceRangeFilter(getFilterValue("credits"));

		if (pageIndex !== 0) {
			setPageIndex(0);
		}
	};

	const handleSortingChange = (newSorting: SortingState): void => {
		setSorting(newSorting.length > 0 ? newSorting : DEFAULT_SORTING);
		if (pageIndex !== 0) {
			setPageIndex(0);
		}
	};

	// Build sort params from sorting state
	const sortParams = React.useMemo(() => {
		const fallbackSort = { id: "name", desc: false } as const;
		const currentSort = sorting?.[0] ?? DEFAULT_SORTING[0] ?? fallbackSort;
		const sortBy = OrganizationSortField.options.includes(
			currentSort.id as OrganizationSortField,
		)
			? (currentSort.id as OrganizationSortField)
			: "name";
		const sortOrder = currentSort.desc ? ("desc" as const) : ("asc" as const);
		return { sortBy, sortOrder };
	}, [sorting]);

	const { data, isPending } = trpc.admin.organization.list.useQuery(
		{
			limit: pageSize || appConfig.pagination.defaultLimit,
			offset:
				(pageIndex || 0) * (pageSize || appConfig.pagination.defaultLimit),
			query: searchQuery || "",
			sortBy: sortParams.sortBy,
			sortOrder: sortParams.sortOrder,
			filters: {
				membersCount: (membersCountFilter || []) as (
					| "0"
					| "1-5"
					| "6-10"
					| "11+"
				)[],
				createdAt: (createdAtFilter || []) as (
					| "today"
					| "this-week"
					| "this-month"
					| "older"
				)[],
				subscriptionStatus: (subscriptionStatusFilter || []) as (
					| "active"
					| "trialing"
					| "canceled"
					| "past_due"
					| "incomplete"
					| "incomplete_expired"
					| "unpaid"
					| "paused"
				)[],
				balanceRange: (balanceRangeFilter || []) as (
					| "zero"
					| "low"
					| "medium"
					| "high"
				)[],
			},
		},
		{
			placeholderData: (prev) => prev,
		},
	);

	const handleSearchQueryChange = (value: string): void => {
		if (value !== searchQuery) {
			setSearchQuery(value);
			if (pageIndex !== 0) {
				setPageIndex(0);
			}
		}
	};

	const columns: ColumnDef<Organization>[] = [
		createSelectionColumn<Organization>(),
		{
			accessorKey: "name",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Organizzazione" />
			),
			cell: ({
				row: {
					original: { name, logo },
				},
			}) => (
				<div className="flex items-center gap-2 py-2">
					<OrganizationLogo className="size-6" name={name} src={logo} />
					<div className="font-medium text-foreground">{name}</div>
				</div>
			),
		},
		{
			accessorKey: "membersCount",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Membri" />
			),
			cell: ({
				row: {
					original: { membersCount },
				},
			}) => (
				<div className="text-foreground/80">
					{membersCount} {membersCount === 1 ? "membro" : "membri"}
				</div>
			),
			filterFn: (row, id, value) => {
				const count = row.getValue(id) as number;
				return value.some((range: string) => {
					switch (range) {
						case "0":
							return count === 0;
						case "1-5":
							return count >= 1 && count <= 5;
						case "6-10":
							return count >= 6 && count <= 10;
						case "11+":
							return count > 10;
						default:
							return false;
					}
				});
			},
		},
		{
			accessorKey: "subscriptionStatus",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Abbonamento" />
			),
			cell: ({ row }) => {
				const status = row.original.subscriptionStatus;
				if (!status) return <span className="text-muted-foreground">—</span>;

				const planLabel = row.original.subscriptionPlan
					? row.original.subscriptionPlan.split("_")[0]
					: "Sconosciuto";

				// Capitalize status for display
				const statusLabel =
					status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

				return (
					<span className="text-foreground/80 text-xs text-nowrap">
						{planLabel} • {statusLabel}
					</span>
				);
			},
		},
		{
			accessorKey: "credits",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Crediti" />
			),
			cell: ({ row }) => {
				const credits = row.original.credits ?? 0;

				return (
					<div className="text-foreground/80 text-xs font-medium">
						{credits.toLocaleString()}
					</div>
				);
			},
		},
		{
			accessorKey: "pendingInvites",
			enableSorting: false,
			header: () => (
				<div className="font-medium text-foreground text-xs text-nowrap">
					Inviti in sospeso
				</div>
			),
			cell: ({ row }) => {
				const pendingInvites = row.original.pendingInvites;
				return (
					<div className="text-foreground/80 text-xs">{pendingInvites}</div>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<SortableColumnHeader column={column} title="Creato" />
			),
			cell: ({
				row: {
					original: { createdAt },
				},
			}) => (
				<div className="text-foreground/80">
					{format(createdAt, "dd MMM, yyyy")}
				</div>
			),
			filterFn: (row, id, value) => {
				const date = row.getValue(id) as Date;
				const now = new Date();
				return value.some((range: string) => {
					switch (range) {
						case "today": {
							const todayStart = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate(),
							);
							const todayEnd = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate() + 1,
							);
							return date >= todayStart && date < todayEnd;
						}
						case "this-week": {
							// Adjust to the start of the current week (Sunday)
							const weekStart = new Date(now);
							weekStart.setDate(now.getDate() - now.getDay());
							weekStart.setHours(0, 0, 0, 0);
							return date >= weekStart;
						}
						case "this-month": {
							const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
							monthStart.setHours(0, 0, 0, 0);
							return date >= monthStart;
						}
						case "older": {
							// Defined as older than a month
							const monthAgo = new Date(
								now.getFullYear(),
								now.getMonth() - 1,
								now.getDate(),
							);
							monthAgo.setHours(23, 59, 59, 999); // End of the day a month ago
							return date <= monthAgo;
						}
						default:
							return false;
					}
				});
			},
		},
		{
			id: "actions",
			enableSorting: false,
			cell: ({ row }) => {
				const { id, name } = row.original;
				return (
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
										NiceModal.show(AdjustCreditsModal, {
											organizationId: id,
											organizationName: name,
											currentBalance: row.original.credits ?? 0,
										});
									}}
								>
									Modifica crediti
								</DropdownMenuItem>
								{row.original.subscriptionId &&
									row.original.subscriptionStatus === "active" && (
										<DropdownMenuItem
											onClick={() => {
												window.open(
													`https://dashboard.stripe.com/subscriptions/${row.original.subscriptionId}`,
													"_blank",
												);
											}}
										>
											Apri in Stripe
										</DropdownMenuItem>
									)}
								{row.original.subscriptionId &&
									row.original.subscriptionStatus === "active" &&
									!row.original.cancelAtPeriodEnd && (
										<DropdownMenuItem
											onClick={() => {
												NiceModal.show(ConfirmationModal, {
													title: "Cancella abbonamento",
													message:
														"Sei sicuro di voler cancellare questo abbonamento alla fine del periodo di fatturazione corrente?",
													confirmLabel: "Cancella abbonamento",
													destructive: true,
													onConfirm: async () => {
														await cancelSubscriptionMutation.mutateAsync(
															{
																subscriptionId: row.original.subscriptionId!,
																immediate: false,
															},
															{
																onSuccess: () => {
																	toast.success(
																		"Abbonamento programmato per la cancellazione a fine periodo",
																	);
																	utils.admin.organization.list.invalidate();
																},
																onError: (error) => {
																	toast.error(
																		`Cancellazione fallita: ${error.message}`,
																	);
																},
															},
														);
													},
												});
											}}
											className="text-destructive focus:text-destructive"
										>
											Cancella abbonamento
										</DropdownMenuItem>
									)}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => {
										NiceModal.show(ConfirmationModal, {
											title: "Sincronizza da Stripe",
											message: `Sincronizzare gli abbonamenti per ${name} da Stripe? Verranno recuperati tutti gli abbonamenti per l'ID cliente di questa organizzazione.`,
											confirmLabel: "Sincronizza",
											onConfirm: async () => {
												await syncFromStripeMutation.mutateAsync(
													{ organizationIds: [id] },
													{
														onSuccess: (result) => {
															const subResult = result.subscriptions;
															const orderResult = result.orders;

															if (
																subResult.failed === 0 &&
																subResult.skipped === 0 &&
																orderResult.failed === 0
															) {
																toast.success(
																	"Dati di fatturazione e crediti sincronizzati da Stripe.",
																);
															} else {
																toast.warning(
																	"Sincronizzazione completata con alcuni problemi. Controlla i log per i dettagli.",
																);
															}
															utils.admin.organization.list.invalidate();
														},
														onError: (error) => {
															toast.error(
																`Sincronizzazione fallita: ${error.message}`,
															);
														},
													},
												);
											},
										});
									}}
								>
									Sincronizza da Stripe
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => {
										NiceModal.show(ConfirmationModal, {
											title: "Elimina workspace",
											message:
												"Sei sicuro di voler eliminare questo workspace? Questa azione non può essere annullata.",
											confirmLabel: "Elimina",
											destructive: true,
											onConfirm: async () => {
												await deleteOrganizationMutation.mutateAsync(
													{ id },
													{
														onSuccess: () => {
															toast.success(
																"Organizzazione eliminata con successo!",
															);
															utils.organization.get.invalidate();
															utils.organization.list.invalidate();
															utils.admin.organization.list.invalidate();
														},
														onError: () => {
															toast.error(
																"Impossibile eliminare l'organizzazione. Riprova.",
															);
														},
													},
												);
											},
										});
									}}
									variant="destructive"
								>
									Elimina
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	const organizationFilters: FilterConfig[] = [
		{
			key: "membersCount",
			title: "Membri",
			options: [
				{ value: "0", label: "0 membri" },
				{ value: "1-5", label: "1-5 membri" },
				{ value: "6-10", label: "6-10 membri" },
				{ value: "11+", label: "11+ membri" },
			],
		},
		{
			key: "createdAt",
			title: "Creato",
			options: [
				{ value: "today", label: "Oggi" },
				{ value: "this-week", label: "Questa settimana" },
				{ value: "this-month", label: "Questo mese" },
				{ value: "older", label: "Precedente" },
			],
		},
		{
			key: "subscriptionStatus",
			title: "Abbonamento",
			options: [
				{ value: "active", label: "Attivo" },
				{ value: "trialing", label: "Prova" },
				{ value: "canceled", label: "Cancellato" },
				{ value: "past_due", label: "Scaduto" },
			],
		},
		{
			key: "credits",
			title: "Crediti",
			options: [
				{ value: "zero", label: "Zero (0)" },
				{ value: "low", label: "Basso (1-1.000)" },
				{ value: "medium", label: "Medio (1k-50k)" },
				{ value: "high", label: "Alto (50k+)" },
			],
		},
	];

	return (
		<DataTable
			columnFilters={columnFilters}
			columns={columns}
			data={data?.organizations || []}
			defaultSorting={DEFAULT_SORTING}
			emptyMessage="Nessun workspace trovato."
			enableFilters
			enablePagination
			enableRowSelection
			enableSearch
			filters={organizationFilters}
			loading={isPending}
			onFiltersChange={handleFiltersChange}
			onPageIndexChange={setPageIndex}
			onPageSizeChange={setPageSize}
			onRowSelectionChange={setRowSelection}
			onSearchQueryChange={handleSearchQueryChange}
			onSortingChange={handleSortingChange}
			pageIndex={pageIndex || 0}
			pageSize={pageSize || appConfig.pagination.defaultLimit}
			renderBulkActions={(table) => <OrganizationBulkActions table={table} />}
			rowSelection={rowSelection}
			searchPlaceholder="Cerca organizzazioni..."
			searchQuery={searchQuery || ""}
			sorting={sorting}
			toolbarActions={
				<Button
					size="sm"
					onClick={() => NiceModal.show(CreateOrganizationAdminModal)}
				>
					<PlusIcon className="mr-1.5 size-4" />
					Nuova organizzazione
				</Button>
			}
			totalCount={data?.total ?? 0}
		/>
	);
}

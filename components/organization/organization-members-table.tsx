"use client";

import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { MoreVerticalIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { OrganizationRoleSelect } from "@/components/organization/organization-role-select";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSession } from "@/hooks/use-session";
import { organizationMemberRoleLabels } from "@/lib/auth/constants";
import { isOrganizationAdmin } from "@/lib/auth/utils";
import { trpc } from "@/trpc/client";
import type { Organization } from "@/types/organization";
import type { OrganizationMemberRole } from "@/types/organization-member-role";

export type OrganizationMembersTableProps = {
	organizationId: string;
};

export function OrganizationMembersTable({
	organizationId,
}: OrganizationMembersTableProps): React.JSX.Element {
	const { user } = useSession();
	const utils = trpc.useUtils();
	const { data: organization } = trpc.organization.get.useQuery({
		id: organizationId,
	});
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);

	const userIsOrganizationAdmin = isOrganizationAdmin(organization, user);
	const currentUserRole = organization?.members?.find(
		(m) => m.user_id === user?.id,
	)?.role;

	const updateMemberRoleMutation =
		trpc.organization.management.updateMemberRole.useMutation({
			onSuccess: () => {
				toast.success("Ruolo aggiornato con successo.");
				utils.organization.get.invalidate({ id: organizationId });
			},
			onError: (err) => {
				toast.error(err.message ?? "Impossibile aggiornare il ruolo. Riprova.");
			},
		});

	const removeMemberMutation =
		trpc.organization.management.removeMember.useMutation({
			onSuccess: () => {
				toast.success("Membro rimosso con successo.");
				utils.organization.get.invalidate({ id: organizationId });
			},
			onError: (err) => {
				toast.error(err.message ?? "Impossibile rimuovere il membro. Riprova.");
			},
		});

	const leaveMutation = trpc.organization.management.leave.useMutation({
		onSuccess: () => {
			toast.success("Hai lasciato l'organizzazione.");
			utils.organization.list.invalidate();
		},
		onError: (err) => {
			toast.error(
				err.message ?? "Impossibile lasciare l'organizzazione. Riprova.",
			);
		},
	});

	const columns: ColumnDef<NonNullable<Organization["members"]>[number]>[] = [
		{
			accessorKey: "user",
			header: "",
			accessorFn: (row) => row.user,
			cell: ({ row }) =>
				row.original.user ? (
					<div className="flex items-center gap-4">
						<UserAvatar
							className="size-6"
							name={row.original.user.name ?? row.original.user.email}
							src={row.original.user?.image}
						/>
						<div>
							<strong className="block font-medium leading-none">
								{row.original.user.name}
							</strong>
							<small className="text-foreground/60">
								{row.original.user.email}
							</small>
						</div>
					</div>
				) : null,
		},
		{
			accessorKey: "actions",
			header: "",
			cell: ({ row }) => {
				return (
					<div className="flex flex-row justify-end gap-2">
						{userIsOrganizationAdmin ? (
							<>
								<OrganizationRoleSelect
									disabled={
										row.original.role === "owner" ||
										row.original.user_id === user?.id ||
										currentUserRole !== "owner"
									}
									excludeRoles={currentUserRole !== "owner" ? ["owner"] : []}
									onSelect={(value) =>
										updateMemberRoleMutation.mutate({
											memberId: row.original.id,
											role: value as "member" | "admin",
										})
									}
									value={row.original.role}
								/>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											disabled={
												organization?.members && organization.members.length < 2
											}
											size="icon"
											type="button"
											variant="ghost"
										>
											<MoreVerticalIcon className="size-4 shrink-0" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{row.original.user_id !== user?.id && (
											<DropdownMenuItem
												className="text-destructive"
												disabled={!isOrganizationAdmin(organization, user)}
												onClick={() =>
													removeMemberMutation.mutate({
														memberId: row.original.id,
													})
												}
											>
												Rimuovi membro
											</DropdownMenuItem>
										)}
										{row.original.user_id === user?.id && (
											<DropdownMenuItem
												className="text-destructive"
												onClick={() => leaveMutation.mutate()}
											>
												Lascia organizzazione
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<span className="font-medium text-foreground/60 text-sm">
								{
									organizationMemberRoleLabels[
										row.original
											.role as keyof typeof organizationMemberRoleLabels
									]
								}
							</span>
						)}
					</div>
				);
			},
		},
	];

	const table = useReactTable({
		data: (organization?.members ?? []) as NonNullable<Organization["members"]>,
		columns,
		manualPagination: true,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
		},
	});

	return (
		<Table>
			<TableBody>
				{table.getRowModel().rows?.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow
							data-state={row.getIsSelected() && "selected"}
							key={row.id}
						>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell className="h-24 text-center" colSpan={columns.length}>
							Nessun membro.
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

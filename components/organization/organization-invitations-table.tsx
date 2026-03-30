"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { CheckIcon, ClockIcon, MoreVerticalIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { OrganizationRoleSelect } from "@/components/organization/organization-role-select";
import { Button } from "@/components/ui/button";
import { EmptyText } from "@/components/ui/custom/empty-text";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { isOrganizationAdmin } from "@/lib/auth/utils";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import type { Organization } from "@/types/organization";
import type { OrganizationMemberRole } from "@/types/organization-member-role";

export type OrganizationInvitationsTableProps = {
	organizationId: string;
};

export function OrganizationInvitationsTable({
	organizationId,
}: OrganizationInvitationsTableProps): React.JSX.Element {
	const { user } = useSession();

	const utils = trpc.useUtils();
	const { data: organization } = trpc.organization.get.useQuery({
		id: organizationId,
	});

	const canUserEditInvitations = isOrganizationAdmin(organization, user);

	const invitations = React.useMemo(
		() =>
			organization?.invitations
				?.filter((invitation) => invitation.status === "pending")
				.sort(
					(a, b) =>
						new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
				),
		[organization?.invitations],
	);

	const cancelInvitation =
		trpc.organization.management.cancelInvitation.useMutation({
			onSuccess: () => {
				toast.success("Invito revocato con successo.");
				utils.organization.get.invalidate({ id: organizationId });
			},
			onError: (err) => {
				toast.error(err.message ?? "Impossibile revocare l'invito. Riprova.");
			},
		});

	const revokeInvitation = (invitationId: string) => {
		cancelInvitation.mutate({ invitationId });
	};

	const columns: ColumnDef<NonNullable<Organization["invitations"]>[number]>[] =
		[
			{
				accessorKey: "email",
				accessorFn: (row) => row.email,
				cell: ({ row }) => {
					const InvitationStatusIcon =
						(
							{
								pending: ClockIcon,
								accepted: CheckIcon,
								rejected: XIcon,
								canceled: XIcon,
							} as Record<string, React.ElementType>
						)[row.original.status] ?? ClockIcon;
					const expiresAt = new Date(row.original.expires_at).toLocaleString();

					const statusLabel = {
						pending: "In attesa",
						accepted: "Accettato",
						rejected: "Rifiutato",
						canceled: "Annullato",
					}[row.original.status];

					return (
						<div className="leading-normal">
							<strong
								className={cn("block", {
									"opacity-50": row.original.status === "canceled",
								})}
							>
								{row.original.email}
							</strong>
							<small className="flex flex-wrap gap-1 text-foreground/60">
								<span className="flex items-center gap-0.5">
									<InvitationStatusIcon className="size-3 shrink-0" />
									{statusLabel}
								</span>
								<span>-</span>
								<span>Scade il {expiresAt}</span>
							</small>
						</div>
					);
				},
			},
			{
				accessorKey: "actions",
				cell: ({ row }) => {
					const isPending = row.original.status === "pending";

					return (
						<div className="flex flex-row justify-end gap-2">
							<OrganizationRoleSelect
								disabled
								onSelect={() => {
									return;
								}}
								value={row.original.role as OrganizationMemberRole}
							/>

							{canUserEditInvitations && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="icon" type="button" variant="ghost">
											<MoreVerticalIcon className="size-4 shrink-0" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuItem
											disabled={!isPending}
											onClick={() => revokeInvitation(row.original.id)}
										>
											Revoca invito
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
					);
				},
			},
		];

	const table = useReactTable({
		data: invitations ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
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
							<EmptyText>Nessun invito in sospeso.</EmptyText>
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

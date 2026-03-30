"use client";

import NiceModal from "@ebay/nice-modal-react";
import { useQueryClient } from "@tanstack/react-query";
import type * as React from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { trpc } from "@/trpc/client";
import { clearOrganizationScopedQueries } from "@/trpc/query-client";

export function DeleteOrganizationCard(): React.JSX.Element | null {
	const router = useProgressRouter();
	const queryClient = useQueryClient();
	const { refetch: reloadOrganizations } = trpc.organization.list.useQuery();
	const { data: organization } = useActiveOrganization();

	const deleteOrganization = trpc.organization.management.delete.useMutation({
		onSuccess: async () => {
			clearOrganizationScopedQueries(queryClient);
			toast.success("La tua organizzazione è stata eliminata.");
			await reloadOrganizations();
			router.replace("/dashboard");
		},
		onError: (err) => {
			toast.error(
				err.message ?? "Impossibile eliminare l'organizzazione. Riprova.",
			);
		},
	});

	if (!organization) {
		return null;
	}

	const handleDelete = () => {
		NiceModal.show(ConfirmationModal, {
			title: "Elimina organizzazione",
			message: `Sei sicuro di voler eliminare l'organizzazione "${organization.name}"? Questa azione non può essere annullata e tutti i dati verranno eliminati definitivamente.`,
			destructive: true,
			requiredText: organization.name,
			confirmLabel: "Elimina organizzazione",
			onConfirm: () => {
				deleteOrganization.mutate();
			},
		});
	};

	return (
		<Card className="border border-destructive">
			<CardHeader>
				<CardTitle>Zona pericolosa</CardTitle>
				<CardDescription>
					Questa sezione contiene azioni irreversibili.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col space-y-4">
					<div className="flex flex-col space-y-1">
						<span className="font-medium text-sm">Elimina organizzazione</span>
						<p className="text-muted-foreground text-sm">
							Questa azione non può essere annullata. Tutti i dati associati a
							questa organizzazione verranno eliminati.
						</p>
					</div>
					<div>
						<Button type="button" variant="destructive" onClick={handleDelete}>
							Elimina organizzazione
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

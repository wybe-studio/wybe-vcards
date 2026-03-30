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
import { authConfig } from "@/config/auth.config";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

export function DeleteAccountCard(): React.JSX.Element {
	const queryClient = useQueryClient();
	const router = useProgressRouter();

	const deleteAccount = trpc.user.deleteAccount.useMutation({
		onSuccess: async () => {
			const supabase = createClient();
			await supabase.auth.signOut();

			toast.success("Account eliminato con successo");
			queryClient.clear();

			const theme = localStorage.getItem("theme");
			const cookieConsent = localStorage.getItem("cookie_consent");
			localStorage.clear();
			sessionStorage.clear();
			if (theme) localStorage.setItem("theme", theme);
			if (cookieConsent) localStorage.setItem("cookie_consent", cookieConsent);

			router.refresh();
			window.location.href = new URL(
				authConfig.redirectAfterLogout,
				window.location.origin,
			).toString();
		},
		onError: (err) => {
			toast.error(err.message ?? "Impossibile eliminare l'account");
		},
	});

	const confirmDelete = () => {
		NiceModal.show(ConfirmationModal, {
			title: "Elimina account",
			message:
				"Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e tutti i tuoi dati verranno eliminati definitivamente.",
			destructive: true,
			confirmLabel: "Elimina account",
			onConfirm: () => {
				deleteAccount.mutate();
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
						<span className="font-medium text-sm">Elimina il tuo account</span>
						<p className="text-muted-foreground text-sm">
							Questa azione eliminerà il tuo account e tutti i dati associati.
							Non può essere annullata.
						</p>
					</div>
					<div>
						<Button
							type="button"
							variant="destructive"
							onClick={() => confirmDelete()}
						>
							Elimina il tuo account
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

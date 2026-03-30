"use client";

import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { createOrganizationAdminSchema } from "@/schemas/admin-create-organization-schemas";
import { trpc } from "@/trpc/client";

export const CreateOrganizationAdminModal = NiceModal.create(() => {
	const modal = useModal();
	const utils = trpc.useUtils();

	const form = useZodForm({
		schema: createOrganizationAdminSchema,
		defaultValues: {
			name: "",
			ownerUserId: "",
		},
	});

	const createOrg = trpc.admin.organization.createOrganization.useMutation({
		onSuccess: () => {
			toast.success("Organizzazione creata con successo");
			utils.admin.organization.list.invalidate();
			modal.hide();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onSubmit = form.handleSubmit((data) => {
		createOrg.mutate(data);
	});

	return (
		<Dialog onOpenChange={(open) => !open && modal.hide()} open={modal.visible}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crea organizzazione</DialogTitle>
					<DialogDescription>
						Crea una nuova organizzazione e assegna un proprietario.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome organizzazione</FormLabel>
									<FormControl>
										<Input placeholder="Acme Corp" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="ownerUserId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>ID utente proprietario</FormLabel>
									<FormControl>
										<Input
											placeholder="UUID dell'utente proprietario"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => modal.hide()}
							>
								Annulla
							</Button>
							<Button type="submit" disabled={createOrg.isPending}>
								{createOrg.isPending && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								Crea organizzazione
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
});

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useZodForm } from "@/hooks/use-zod-form";
import { addMemberAdminSchema } from "@/schemas/admin-create-organization-schemas";
import { trpc } from "@/trpc/client";

type AddMemberModalProps = {
	organizationId: string;
};

export const AddMemberModal = NiceModal.create(
	({ organizationId }: AddMemberModalProps) => {
		const modal = useModal();
		const utils = trpc.useUtils();

		const form = useZodForm({
			schema: addMemberAdminSchema,
			defaultValues: {
				organizationId,
				userId: "",
				role: "member",
			},
		});

		const addMember = trpc.admin.organization.addMember.useMutation({
			onSuccess: () => {
				toast.success("Membro aggiunto con successo");
				utils.admin.organization.list.invalidate();
				modal.hide();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			addMember.mutate(data);
		});

		return (
			<Dialog
				onOpenChange={(open) => !open && modal.hide()}
				open={modal.visible}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Aggiungi membro</DialogTitle>
						<DialogDescription>
							Aggiungi un utente a questa organizzazione.
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-4">
							<FormField
								control={form.control}
								name="userId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ID utente</FormLabel>
										<FormControl>
											<Input
												placeholder="UUID dell'utente da aggiungere"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ruolo</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="member">Membro</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
												<SelectItem value="owner">Proprietario</SelectItem>
											</SelectContent>
										</Select>
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
								<Button type="submit" disabled={addMember.isPending}>
									{addMember.isPending && (
										<Loader2Icon className="mr-2 size-4 animate-spin" />
									)}
									Aggiungi membro
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);

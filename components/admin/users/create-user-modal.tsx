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
import { createUserAdminSchema } from "@/schemas/admin-create-user-schemas";
import { trpc } from "@/trpc/client";

export const CreateUserModal = NiceModal.create(() => {
	const modal = useModal();
	const utils = trpc.useUtils();

	const form = useZodForm({
		schema: createUserAdminSchema,
		defaultValues: {
			email: "",
			password: "",
			name: "",
			role: "user",
		},
	});

	const createUser = trpc.admin.user.createUser.useMutation({
		onSuccess: () => {
			toast.success("Utente creato con successo");
			utils.admin.user.list.invalidate();
			modal.hide();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const onSubmit = form.handleSubmit((data) => {
		createUser.mutate(data);
	});

	return (
		<Dialog onOpenChange={(open) => !open && modal.hide()} open={modal.visible}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crea utente</DialogTitle>
					<DialogDescription>
						Crea un nuovo utente nella piattaforma.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome</FormLabel>
									<FormControl>
										<Input placeholder="Mario Rossi" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											placeholder="mario@esempio.it"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<Input
											placeholder="Minimo 8 caratteri"
											type="password"
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
									<FormLabel>Ruolo piattaforma</FormLabel>
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
											<SelectItem value="user">Utente</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
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
							<Button type="submit" disabled={createUser.isPending}>
								{createUser.isPending && (
									<Loader2Icon className="mr-2 size-4 animate-spin" />
								)}
								Crea utente
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
});

"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { adminUpdateVcardSchema } from "@/schemas/admin-vcard-schemas";
import { trpc } from "@/trpc/client";

export type AdminEditVcardModalProps = NiceModalHocProps & {
	organizationId: string;
	vcard: {
		id: string;
		first_name: string;
		last_name: string;
		slug: string;
		email: string | null;
		phone: string | null;
		job_title: string | null;
		status: string;
	};
};

export const AdminEditVcardModal = NiceModal.create<AdminEditVcardModalProps>(
	({ organizationId, vcard }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const mutation = trpc.admin.vcard.update.useMutation({
			onSuccess: () => {
				toast.success("vCard aggiornata");
				utils.admin.physicalCard.listOrgVcards.invalidate({ organizationId });
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

		const form = useZodForm({
			schema: adminUpdateVcardSchema.omit({
				organizationId: true,
				vcardId: true,
			}),
			defaultValues: {
				first_name: vcard.first_name,
				last_name: vcard.last_name,
				slug: vcard.slug,
				email: vcard.email ?? "",
				phone: vcard.phone ?? "",
				job_title: vcard.job_title ?? "",
				status: vcard.status as "active" | "suspended" | "archived",
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			mutation.mutate({
				organizationId,
				vcardId: vcard.id,
				...data,
			});
		});

		return (
			<Sheet onOpenChange={modal.handleOpenChange} open={modal.visible}>
				<SheetContent onAnimationEndCapture={modal.handleAnimationEndCapture}>
					<SheetHeader>
						<SheetTitle>Modifica vCard</SheetTitle>
						<SheetDescription>
							Modifica i dati della vCard di {vcard.first_name}{" "}
							{vcard.last_name}
						</SheetDescription>
					</SheetHeader>
					<Form {...form}>
						<form className="flex flex-col gap-4 px-4" onSubmit={onSubmit}>
							<FormField
								control={form.control}
								name="first_name"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Nome</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="last_name"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Cognome</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="email"
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Telefono</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="job_title"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Ruolo</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Slug</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Stato</FormLabel>
											<Select
												defaultValue={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="active">Attiva</SelectItem>
													<SelectItem value="suspended">Sospesa</SelectItem>
													<SelectItem value="archived">Archiviata</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<SheetFooter>
								<Button
									onClick={modal.handleClose}
									type="button"
									variant="outline"
								>
									Annulla
								</Button>
								<Button loading={mutation.isPending} type="submit">
									Salva
								</Button>
							</SheetFooter>
						</form>
					</Form>
				</SheetContent>
			</Sheet>
		);
	},
);

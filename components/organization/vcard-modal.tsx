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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { VcardStatus } from "@/lib/enums";
import { createVcardSchema, updateVcardSchema } from "@/schemas/vcard-schemas";
import { trpc } from "@/trpc/client";

const statusLabels: Record<string, string> = {
	active: "Attiva",
	suspended: "Sospesa",
	archived: "Archiviata",
};

export type VcardModalProps = NiceModalHocProps & {
	vcard?: {
		id: string;
		firstName: string;
		lastName: string;
		slug: string;
		jobTitle?: string | null;
		email?: string | null;
		phone?: string | null;
		phoneSecondary?: string | null;
		linkedinUrl?: string | null;
		status: string;
		userId?: string | null;
	};
};

export const VcardModal = NiceModal.create<VcardModalProps>(({ vcard }) => {
	const modal = useEnhancedModal();
	const utils = trpc.useUtils();
	const isEditing = !!vcard;

	const createMutation = trpc.organization.vcard.create.useMutation({
		onSuccess: () => {
			toast.success("vCard creata con successo");
			utils.organization.vcard.list.invalidate();
			modal.handleClose();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile creare la vCard");
		},
	});

	const updateMutation = trpc.organization.vcard.update.useMutation({
		onSuccess: () => {
			toast.success("vCard aggiornata con successo");
			utils.organization.vcard.list.invalidate();
			modal.handleClose();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile aggiornare la vCard");
		},
	});

	const form = useZodForm({
		schema: isEditing ? updateVcardSchema : createVcardSchema,
		defaultValues: isEditing
			? {
					id: vcard.id,
					firstName: vcard.firstName,
					lastName: vcard.lastName,
					slug: vcard.slug,
					jobTitle: vcard.jobTitle ?? "",
					email: vcard.email ?? "",
					phone: vcard.phone ?? "",
					phoneSecondary: vcard.phoneSecondary ?? "",
					linkedinUrl: vcard.linkedinUrl ?? "",
					status: vcard.status as VcardStatus,
				}
			: {
					firstName: "",
					lastName: "",
					jobTitle: "",
					email: "",
					phone: "",
					phoneSecondary: "",
					linkedinUrl: "",
					status: VcardStatus.active,
				},
	});

	const onSubmit = form.handleSubmit((data) => {
		if (isEditing) {
			updateMutation.mutate(
				data as Parameters<typeof updateMutation.mutate>[0],
			);
		} else {
			createMutation.mutate(
				data as Parameters<typeof createMutation.mutate>[0],
			);
		}
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Sheet
			open={modal.visible}
			onOpenChange={(open) => !open && modal.handleClose()}
		>
			<SheetContent
				className="sm:max-w-lg"
				onAnimationEndCapture={modal.handleAnimationEndCapture}
			>
				<SheetHeader>
					<SheetTitle>{isEditing ? "Modifica vCard" : "Crea vCard"}</SheetTitle>
					<SheetDescription className="sr-only">
						{isEditing
							? "Aggiorna le informazioni della vCard."
							: "Compila i dettagli per creare una nuova vCard."}
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={onSubmit}
						className="flex flex-1 flex-col overflow-hidden"
					>
						<ScrollArea className="flex-1">
							<div className="space-y-4 px-6 py-4">
								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="firstName"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Nome</FormLabel>
													<FormControl>
														<Input
															placeholder="Mario"
															autoComplete="off"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</Field>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="lastName"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Cognome</FormLabel>
													<FormControl>
														<Input
															placeholder="Rossi"
															autoComplete="off"
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</Field>
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="jobTitle"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Ruolo</FormLabel>
												<FormControl>
													<Input
														placeholder="Responsabile Marketing"
														autoComplete="off"
														{...field}
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
									name="email"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder="mario.rossi@azienda.it"
														autoComplete="off"
														{...field}
														value={field.value ?? ""}
													/>
												</FormControl>
												<FormMessage />
											</Field>
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-2 gap-4">
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Telefono</FormLabel>
													<FormControl>
														<Input
															placeholder="+39 333 1234567"
															autoComplete="off"
															{...field}
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
										name="phoneSecondary"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Telefono secondario</FormLabel>
													<FormControl>
														<Input
															placeholder="+39 06 12345678"
															autoComplete="off"
															{...field}
															value={field.value ?? ""}
														/>
													</FormControl>
													<FormMessage />
												</Field>
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="linkedinUrl"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>LinkedIn</FormLabel>
												<FormControl>
													<Input
														placeholder="https://linkedin.com/in/mario-rossi"
														autoComplete="off"
														{...field}
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
									name="status"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Stato</FormLabel>
												<Select
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<FormControl>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Seleziona stato" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{Object.values(VcardStatus).map((status) => (
															<SelectItem key={status} value={status}>
																{statusLabels[status] || status}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</Field>
										</FormItem>
									)}
								/>
							</div>
						</ScrollArea>

						<SheetFooter className="flex-row justify-end gap-2 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={modal.handleClose}
								disabled={isPending}
							>
								Annulla
							</Button>
							<Button type="submit" disabled={isPending} loading={isPending}>
								{isEditing ? "Aggiorna vCard" : "Crea vCard"}
							</Button>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
});

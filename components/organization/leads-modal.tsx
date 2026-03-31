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
import { Textarea } from "@/components/ui/textarea";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { LeadSource, LeadStatus } from "@/lib/enums";
import { capitalize } from "@/lib/utils";
import {
	createLeadSchema,
	updateLeadSchema,
} from "@/schemas/organization-lead-schemas";
import { trpc } from "@/trpc/client";

const statusLabels: Record<string, string> = {
	new: "Nuovo",
	contacted: "Contattato",
	qualified: "Qualificato",
	proposal: "Proposta",
	negotiation: "Negoziazione",
	won: "Vinto",
	lost: "Perso",
};

const sourceLabels: Record<string, string> = {
	website: "Sito web",
	referral: "Referral",
	social_media: "Social media",
	advertising: "Pubblicit\u00E0",
	cold_call: "Chiamata a freddo",
	email: "Email",
	event: "Evento",
	other: "Altro",
};

export type LeadsModalProps = NiceModalHocProps & {
	lead?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		phone?: string | null;
		company?: string | null;
		jobTitle?: string | null;
		status: string;
		source: string;
		estimatedValue?: number | null;
		notes?: string | null;
		assignedToId?: string | null;
	};
};

export const LeadsModal = NiceModal.create<LeadsModalProps>(({ lead }) => {
	const modal = useEnhancedModal();
	const utils = trpc.useUtils();
	const isEditing = !!lead;

	const createLeadMutation = trpc.organization.lead.create.useMutation({
		onSuccess: () => {
			toast.success("Lead creato con successo");
			utils.organization.lead.list.invalidate();
			modal.handleClose();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile creare il lead");
		},
	});

	const updateLeadMutation = trpc.organization.lead.update.useMutation({
		onSuccess: () => {
			toast.success("Lead aggiornato con successo");
			utils.organization.lead.list.invalidate();
			modal.handleClose();
		},
		onError: (error) => {
			toast.error(error.message || "Impossibile aggiornare il lead");
		},
	});

	const form = useZodForm({
		schema: isEditing ? updateLeadSchema : createLeadSchema,
		defaultValues: isEditing
			? {
					id: lead.id,
					firstName: lead.firstName,
					lastName: lead.lastName,
					email: lead.email,
					phone: lead.phone ?? "",
					company: lead.company ?? "",
					jobTitle: lead.jobTitle ?? "",
					status: lead.status as LeadStatus,
					source: lead.source as LeadSource,
					estimatedValue: lead.estimatedValue ?? undefined,
					notes: lead.notes ?? "",
				}
			: {
					firstName: "",
					lastName: "",
					email: "",
					phone: "",
					company: "",
					jobTitle: "",
					status: LeadStatus.new,
					source: LeadSource.other,
					estimatedValue: undefined,
					notes: "",
				},
	});

	const onSubmit = form.handleSubmit((data) => {
		if (isEditing) {
			updateLeadMutation.mutate(
				data as Parameters<typeof updateLeadMutation.mutate>[0],
			);
		} else {
			createLeadMutation.mutate(
				data as Parameters<typeof createLeadMutation.mutate>[0],
			);
		}
	});

	const isPending =
		createLeadMutation.isPending || updateLeadMutation.isPending;

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
					<SheetTitle>{isEditing ? "Modifica Lead" : "Crea Lead"}</SheetTitle>
					<SheetDescription className="sr-only">
						{isEditing
							? "Aggiorna le informazioni del lead qui sotto."
							: "Compila i dettagli per creare un nuovo lead."}
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
						<ScrollArea className="min-h-0 flex-1">
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
															placeholder="John"
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
															placeholder="Doe"
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
									name="email"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Email</FormLabel>
												<FormControl>
													<Input
														type="email"
														placeholder="john.doe@example.com"
														autoComplete="off"
														{...field}
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
															placeholder="+1 (555) 123-4567"
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
										name="company"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Azienda</FormLabel>
													<FormControl>
														<Input
															placeholder="Acme Inc."
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
									name="jobTitle"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Ruolo professionale</FormLabel>
												<FormControl>
													<Input
														placeholder="Marketing Manager"
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
															{Object.values(LeadStatus).map((status) => (
																<SelectItem key={status} value={status}>
																	{statusLabels[status] ||
																		capitalize(status.replace("_", " "))}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</Field>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="source"
										render={({ field }) => (
											<FormItem asChild>
												<Field>
													<FormLabel>Fonte</FormLabel>
													<Select
														onValueChange={field.onChange}
														defaultValue={field.value}
													>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Seleziona fonte" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{Object.values(LeadSource).map((source) => (
																<SelectItem key={source} value={source}>
																	{sourceLabels[source] ||
																		capitalize(source.replace("_", " "))}
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

								<FormField
									control={form.control}
									name="estimatedValue"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Valore stimato ($)</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="10000"
														autoComplete="off"
														{...field}
														value={field.value ?? ""}
														onChange={(e) =>
															field.onChange(
																e.target.value
																	? Number(e.target.value)
																	: undefined,
															)
														}
													/>
												</FormControl>
												<FormMessage />
											</Field>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Note</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Note aggiuntive su questo lead..."
														className="resize-none"
														rows={3}
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
								{isEditing ? "Aggiorna Lead" : "Crea Lead"}
							</Button>
						</SheetFooter>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
});

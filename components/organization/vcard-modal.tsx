"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { VcardImageUpload } from "@/components/organization/vcard-image-upload";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Field } from "@/components/ui/field";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
import { UserAvatar } from "@/components/user/user-avatar";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useSession } from "@/hooks/use-session";
import { useZodForm } from "@/hooks/use-zod-form";
import { VcardStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { createVcardSchema, updateVcardSchema } from "@/schemas/vcard-schemas";
import { trpc } from "@/trpc/client";

const statusLabels: Record<string, string> = {
	active: "Attiva",
	suspended: "Sospesa",
	archived: "Archiviata",
};

export type VcardModalProps = NiceModalHocProps & {
	organizationId: string;
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
		profileImage?: string | null;
		status: string;
		userId?: string | null;
	};
};

export const VcardModal = NiceModal.create<VcardModalProps>(
	({ organizationId, vcard }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();
		const isEditing = !!vcard;

		const { user } = useSession();

		// Fetch org with members via tRPC (NiceModal mounts outside ActiveOrganizationContext)
		const { data: orgData } = trpc.organization.get.useQuery(
			{ id: organizationId },
			{ enabled: !!organizationId },
		);
		const members = orgData?.members ?? [];
		const currentMemberRole = members.find((m) => m.user_id === user?.id)?.role;
		const userIsAdmin =
			user?.role === "admin" ||
			currentMemberRole === "owner" ||
			currentMemberRole === "admin";

		const [memberPopoverOpen, setMemberPopoverOpen] = React.useState(false);

		const createMutation = trpc.organization.vcard.create.useMutation({
			onSuccess: () => {
				toast.success("vCard creata con successo");
				utils.organization.vcard.list.invalidate();
				utils.organization.vcard.stats.invalidate();
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
				utils.organization.vcard.stats.invalidate();
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
						profileImage: vcard.profileImage ?? "",
						status: vcard.status as VcardStatus,
						userId: vcard.userId ?? undefined,
					}
				: {
						firstName: "",
						lastName: "",
						jobTitle: "",
						email: "",
						phone: "",
						phoneSecondary: "",
						linkedinUrl: "",
						profileImage: "",
						status: VcardStatus.active,
						userId: undefined,
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
						<SheetTitle>
							{isEditing ? "Modifica vCard" : "Crea vCard"}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{isEditing
								? "Aggiorna le informazioni della vCard."
								: "Compila i dettagli per creare una nuova vCard."}
						</SheetDescription>
					</SheetHeader>

					<Form {...form}>
						<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
							<ScrollArea className="min-h-0 flex-1">
								<div className="space-y-4 px-6 py-4">
									<FormField
										control={form.control}
										name="profileImage"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<VcardImageUpload
														value={field.value || null}
														onChange={(path) => field.onChange(path ?? "")}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

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

									{isEditing && (
										<FormField
											control={form.control}
											name="slug"
											render={({ field }) => (
												<FormItem asChild>
													<Field>
														<FormLabel>URL personalizzato</FormLabel>
														<FormControl>
															<Input
																placeholder="mario.rossi"
																autoComplete="off"
																{...field}
																value={field.value ?? ""}
															/>
														</FormControl>
														<FormDescription>
															Lo slug che appare nell&apos;URL della vCard. Deve
															essere unico nell&apos;organizzazione.
														</FormDescription>
														<FormMessage />
													</Field>
												</FormItem>
											)}
										/>
									)}

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

									{userIsAdmin && (
										<FormField
											control={form.control}
											name="userId"
											render={({ field }) => {
												const selectedMember = members.find(
													(m) => m.user_id === field.value,
												);
												return (
													<FormItem asChild>
														<Field>
															<FormLabel>Membro collegato</FormLabel>
															<Popover
																open={memberPopoverOpen}
																onOpenChange={setMemberPopoverOpen}
															>
																<PopoverTrigger asChild>
																	<FormControl>
																		<Button
																			variant="outline"
																			role="combobox"
																			aria-expanded={memberPopoverOpen}
																			className={cn(
																				"w-full justify-between font-normal",
																				!field.value && "text-muted-foreground",
																			)}
																		>
																			{selectedMember ? (
																				<span className="flex items-center gap-2 truncate">
																					<UserAvatar
																						className="size-5 shrink-0"
																						name={
																							selectedMember.user?.name ??
																							selectedMember.user?.email ??
																							""
																						}
																						src={selectedMember.user?.image}
																					/>
																					<span className="truncate">
																						{selectedMember.user?.name ??
																							selectedMember.user?.email}
																					</span>
																				</span>
																			) : (
																				"Seleziona membro..."
																			)}
																			{field.value ? (
																				<XIcon
																					className="ml-auto size-4 shrink-0 opacity-50 hover:opacity-100"
																					onClick={(e) => {
																						e.stopPropagation();
																						field.onChange(null);
																					}}
																				/>
																			) : (
																				<ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
																			)}
																		</Button>
																	</FormControl>
																</PopoverTrigger>
																<PopoverContent
																	className="w-[--radix-popover-trigger-width] p-0"
																	align="start"
																>
																	<Command>
																		<CommandInput placeholder="Cerca membro..." />
																		<CommandList>
																			<CommandEmpty>
																				Nessun membro trovato.
																			</CommandEmpty>
																			<CommandGroup>
																				{field.value && (
																					<CommandItem
																						value="__rimuovi__"
																						onSelect={() => {
																							field.onChange(null);
																							setMemberPopoverOpen(false);
																						}}
																						className="text-muted-foreground"
																					>
																						<XIcon className="size-4 shrink-0" />
																						Rimuovi assegnazione
																					</CommandItem>
																				)}
																				{members.map((member) => (
																					<CommandItem
																						key={member.user_id}
																						value={`${member.user?.name ?? ""} ${member.user?.email ?? ""}`}
																						onSelect={() => {
																							field.onChange(
																								field.value === member.user_id
																									? null
																									: member.user_id,
																							);
																							setMemberPopoverOpen(false);
																						}}
																					>
																						<UserAvatar
																							className="size-5 shrink-0"
																							name={
																								member.user?.name ??
																								member.user?.email ??
																								""
																							}
																							src={member.user?.image}
																						/>
																						<div className="min-w-0 flex-1">
																							<div className="truncate text-sm">
																								{member.user?.name}
																							</div>
																							<div className="truncate text-muted-foreground text-xs">
																								{member.user?.email}
																							</div>
																						</div>
																						<CheckIcon
																							className={cn(
																								"ml-auto size-4 shrink-0",
																								field.value === member.user_id
																									? "opacity-100"
																									: "opacity-0",
																							)}
																						/>
																					</CommandItem>
																				))}
																			</CommandGroup>
																		</CommandList>
																	</Command>
																</PopoverContent>
															</Popover>
															<FormDescription>
																Collega questa vCard a un membro
																dell&apos;organizzazione.
															</FormDescription>
															<FormMessage />
														</Field>
													</FormItem>
												);
											}}
										/>
									)}
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
	},
);

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
import { assignPhysicalCardSchema } from "@/schemas/physical-card-schemas";
import { trpc } from "@/trpc/client";

export type PhysicalCardAssignModalProps = NiceModalHocProps & {
	cardId: string;
	cardCode: string;
};

export const PhysicalCardAssignModal =
	NiceModal.create<PhysicalCardAssignModalProps>(({ cardId, cardCode }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const { data: vcardsData } = trpc.organization.vcard.list.useQuery({
			limit: 100,
			offset: 0,
			sortBy: "first_name",
			sortOrder: "asc",
			filters: { status: ["active"] },
		});

		const assignMutation = trpc.organization.physicalCard.assign.useMutation({
			onSuccess: () => {
				toast.success("Card assegnata con successo");
				utils.organization.physicalCard.list.invalidate();
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message || "Impossibile assegnare la card");
			},
		});

		const form = useZodForm({
			schema: assignPhysicalCardSchema,
			defaultValues: {
				id: cardId,
				vcardId: "",
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			assignMutation.mutate(data);
		});

		const vcards = vcardsData?.data ?? [];

		return (
			<Sheet
				open={modal.visible}
				onOpenChange={(open) => !open && modal.handleClose()}
			>
				<SheetContent
					className="sm:max-w-md"
					onAnimationEndCapture={modal.handleAnimationEndCapture}
				>
					<SheetHeader>
						<SheetTitle>Assegna card {cardCode}</SheetTitle>
						<SheetDescription>
							Seleziona la vCard a cui associare questa card fisica.
						</SheetDescription>
					</SheetHeader>

					<Form {...form}>
						<form
							onSubmit={onSubmit}
							className="flex flex-1 flex-col overflow-hidden"
						>
							<div className="space-y-4 px-6 py-4">
								<FormField
									control={form.control}
									name="vcardId"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>vCard</FormLabel>
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger className="w-full">
															<SelectValue placeholder="Seleziona una vCard" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{vcards.map((vc) => (
															<SelectItem key={vc.id} value={vc.id}>
																{vc.first_name} {vc.last_name}
																{vc.job_title ? ` — ${vc.job_title}` : ""}
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

							<SheetFooter className="flex-row justify-end gap-2 border-t">
								<Button
									type="button"
									variant="outline"
									onClick={modal.handleClose}
									disabled={assignMutation.isPending}
								>
									Annulla
								</Button>
								<Button
									type="submit"
									disabled={assignMutation.isPending || !form.watch("vcardId")}
									loading={assignMutation.isPending}
								>
									Assegna
								</Button>
							</SheetFooter>
						</form>
					</Form>
				</SheetContent>
			</Sheet>
		);
	});

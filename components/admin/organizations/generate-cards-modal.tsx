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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { generatePhysicalCardsBatchSchema } from "@/schemas/admin-vcard-schemas";
import { trpc } from "@/trpc/client";

export type GenerateCardsModalProps = NiceModalHocProps & {
	organizationId: string;
	remaining: number;
};

export const GenerateCardsModal = NiceModal.create<GenerateCardsModalProps>(
	({ organizationId, remaining }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const generateMutation = trpc.admin.physicalCard.generateBatch.useMutation({
			onSuccess: (data) => {
				toast.success(`${data.generated} card fisiche generate`);
				utils.admin.physicalCard.listOrgPhysicalCards.invalidate();
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message || "Impossibile generare le card");
			},
		});

		const form = useZodForm({
			schema: generatePhysicalCardsBatchSchema,
			defaultValues: {
				organizationId,
				count: Math.min(10, remaining),
			},
		});

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
						<SheetTitle>Genera card fisiche</SheetTitle>
						<SheetDescription>
							Puoi generare fino a {remaining} card fisiche.
						</SheetDescription>
					</SheetHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit((data) =>
								generateMutation.mutate(data),
							)}
							className="flex flex-1 flex-col overflow-hidden"
						>
							<div className="space-y-4 px-6 py-4">
								<FormField
									control={form.control}
									name="count"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Quantita</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={1}
														max={Math.min(500, remaining)}
														{...field}
														onChange={(e) =>
															field.onChange(Number(e.target.value))
														}
													/>
												</FormControl>
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
									disabled={generateMutation.isPending}
								>
									Annulla
								</Button>
								<Button
									type="submit"
									disabled={generateMutation.isPending}
									loading={generateMutation.isPending}
								>
									Genera
								</Button>
							</SheetFooter>
						</form>
					</Form>
				</SheetContent>
			</Sheet>
		);
	},
);

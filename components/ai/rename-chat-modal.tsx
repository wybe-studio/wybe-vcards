"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { toast } from "sonner";
import { z } from "zod/v4";
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
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { trpc } from "@/trpc/client";

const renameChatSchema = z.object({
	title: z
		.string()
		.min(1, "Il titolo è obbligatorio")
		.max(200, "Il titolo è troppo lungo"),
});

export type RenameChatModalProps = NiceModalHocProps & {
	chatId: string;
	currentTitle: string;
};

export const RenameChatModal = NiceModal.create<RenameChatModalProps>(
	({ chatId, currentTitle }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();
		const updateChatMutation = trpc.organization.ai.updateChat.useMutation();

		const form = useZodForm({
			schema: renameChatSchema,
			defaultValues: {
				title: currentTitle,
			},
		});

		const onSubmit = form.handleSubmit(async ({ title }) => {
			if (title.trim() === currentTitle) {
				modal.handleClose();
				return;
			}

			try {
				await updateChatMutation.mutateAsync({
					id: chatId,
					title: title.trim(),
				});
				await utils.organization.ai.listChats.invalidate();
				toast.success("Chat rinominata");
				modal.handleClose();
			} catch {
				toast.error("Rinomina chat non riuscita");
			}
		});

		return (
			<Form {...form}>
				<Dialog open={modal.visible} onOpenChange={modal.handleOpenChange}>
					<DialogContent
						className="max-w-md"
						onAnimationEndCapture={modal.handleAnimationEndCapture}
						onClose={modal.handleClose}
					>
						<DialogHeader>
							<DialogTitle>Rinomina chat</DialogTitle>
							<DialogDescription>
								Inserisci un nuovo nome per questa conversazione.
							</DialogDescription>
						</DialogHeader>
						<form onSubmit={onSubmit}>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Titolo</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter className="mt-4">
								<Button
									disabled={form.formState.isSubmitting}
									onClick={modal.handleClose}
									type="button"
									variant="outline"
								>
									Annulla
								</Button>
								<Button
									disabled={form.formState.isSubmitting}
									loading={form.formState.isSubmitting}
									type="submit"
									variant="default"
								>
									Rinomina
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</Form>
		);
	},
);

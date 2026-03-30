"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { cn } from "@/lib/utils";
import { banUserAdminSchema } from "@/schemas/admin-user-schemas";
import { trpc } from "@/trpc/client";

export type BanUserModalProps = NiceModalHocProps & {
	userId: string;
	userName: string;
};

export const BanUserModal = NiceModal.create(
	({ userId, userName }: BanUserModalProps) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const form = useZodForm({
			schema: banUserAdminSchema,
			defaultValues: {
				userId,
				reason: "",
				expiresAt: undefined,
			},
		});

		const banUserMutation = trpc.admin.user.banUser.useMutation({
			onSuccess: () => {
				toast.success("L'utente e stato bloccato");
				utils.admin.user.list.invalidate();
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message || "Impossibile bloccare l'utente");
			},
		});

		const onSubmit = form.handleSubmit((data) => {
			banUserMutation.mutate(data);
		});

		return (
			<Dialog open={modal.visible}>
				<DialogContent
					className="max-w-md"
					onAnimationEndCapture={modal.handleAnimationEndCapture}
					onClose={modal.handleClose}
				>
					<DialogHeader>
						<DialogTitle>Blocca utente</DialogTitle>
						<DialogDescription>
							Blocca <span className="font-medium">{userName}</span> dalla
							piattaforma.
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-4">
							<FormField
								control={form.control}
								name="reason"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Motivo del blocco</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Inserisci il motivo del blocco di questo utente..."
												className="resize-none"
												rows={3}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Mostrato all'utente quando tenta di accedere.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="expiresAt"
								render={({ field }) => (
									<FormItem className="flex flex-col">
										<FormLabel>Scadenza del blocco (opzionale)</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-full pl-3 text-left font-normal",
															!field.value && "text-muted-foreground",
														)}
													>
														{field.value ? (
															format(field.value, "PPP")
														) : (
															<span>Seleziona una data</span>
														)}
														<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="start">
												<Calendar
													mode="single"
													selected={field.value}
													onSelect={field.onChange}
													disabled={(date) =>
														date < new Date() || date < new Date("1900-01-01")
													}
												/>
											</PopoverContent>
										</Popover>
										<FormDescription>
											Lascia vuoto per un blocco permanente.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={modal.handleClose}
								>
									Annulla
								</Button>
								<Button
									type="submit"
									variant="destructive"
									disabled={banUserMutation.isPending}
								>
									{banUserMutation.isPending
										? "Blocco in corso..."
										: "Blocca utente"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);

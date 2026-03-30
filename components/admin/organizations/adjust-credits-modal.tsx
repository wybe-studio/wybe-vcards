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
	FormDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useZodForm } from "@/hooks/use-zod-form";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

const adjustCreditsSchema = z.object({
	type: z.enum(["add", "subtract"]),
	amount: z.number().positive("Amount must be positive"),
	description: z.string().min(1, "Description is required").max(500),
});

export type AdjustCreditsModalProps = NiceModalHocProps & {
	organizationId: string;
	organizationName: string;
	currentBalance: number;
};

export const AdjustCreditsModal = NiceModal.create(
	({
		organizationId,
		organizationName,
		currentBalance,
	}: AdjustCreditsModalProps) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();

		const form = useZodForm({
			schema: adjustCreditsSchema,
			defaultValues: {
				type: "add" as const,
				amount: 0,
				description: "",
			},
		});

		const adjustMutation = trpc.admin.organization.adjustCredits.useMutation({
			onSuccess: (data) => {
				toast.success(
					`Crediti aggiornati. Nuovo saldo: ${data.newBalance.toLocaleString()}`,
				);
				utils.admin.organization.list.invalidate();
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message || "Impossibile aggiornare i crediti");
			},
		});

		const onSubmit = form.handleSubmit((values) => {
			const amount =
				values.type === "subtract" ? -values.amount : values.amount;
			adjustMutation.mutate({
				organizationId,
				amount,
				description: values.description,
			});
		});

		const watchType = form.watch("type");
		const watchAmount = form.watch("amount");
		const newBalance =
			watchType === "add"
				? currentBalance + (watchAmount || 0)
				: currentBalance - (watchAmount || 0);
		const wouldGoNegative = watchType === "subtract" && newBalance < 0;

		return (
			<Dialog open={modal.visible}>
				<DialogContent
					className="sm:max-w-[425px]"
					onAnimationEndCapture={modal.handleAnimationEndCapture}
					onClose={modal.handleClose}
				>
					<DialogHeader>
						<DialogTitle>Modifica crediti</DialogTitle>
						<DialogDescription>
							Modifica il saldo crediti per <strong>{organizationName}</strong>.
							Saldo attuale: {currentBalance.toLocaleString()} crediti.
						</DialogDescription>
					</DialogHeader>
					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-4">
							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Tipo</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Seleziona azione" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="add">Aggiungi crediti</SelectItem>
												<SelectItem value="subtract">
													Sottrai crediti
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="amount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Importo</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												placeholder="Inserisci importo"
												autoComplete="off"
												{...field}
												value={field.value ?? ""}
												onChange={(e) =>
													field.onChange(
														e.target.value ? Number(e.target.value) : 0,
													)
												}
											/>
										</FormControl>
										<FormDescription
											className={cn(wouldGoNegative && "text-destructive")}
										>
											Il nuovo saldo sara: {newBalance.toLocaleString()} crediti
											{wouldGoNegative && " (non può andare in negativo)"}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Motivo</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Inserisci il motivo della modifica (obbligatorio per la tracciabilita)"
												className="resize-none"
												{...field}
											/>
										</FormControl>
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
									disabled={adjustMutation.isPending || wouldGoNegative}
									variant={watchType === "subtract" ? "destructive" : "default"}
								>
									{adjustMutation.isPending
										? "Aggiornamento..."
										: watchType === "add"
											? "Aggiungi crediti"
											: "Sottrai crediti"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		);
	},
);

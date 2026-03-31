"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { trpc } from "@/trpc/client";

export type AdminAssignCardModalProps = NiceModalHocProps & {
	organizationId: string;
	cardId: string;
	cardCode: string;
};

export const AdminAssignCardModal = NiceModal.create<AdminAssignCardModalProps>(
	({ organizationId, cardId, cardCode }) => {
		const modal = useEnhancedModal();
		const utils = trpc.useUtils();
		const [open, setOpen] = React.useState(false);
		const [selectedVcardId, setSelectedVcardId] = React.useState<string | null>(
			null,
		);
		const [search, setSearch] = React.useState("");

		const { data: vcardsData } = trpc.admin.physicalCard.listOrgVcards.useQuery(
			{
				organizationId,
				limit: 100,
				offset: 0,
				query: search || undefined,
			},
		);

		// Filter out vcards that already have a physical card assigned
		const { data: assignedCards } =
			trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
				organizationId,
				limit: 1000,
				offset: 0,
			});

		const assignedVcardIds = new Set(
			assignedCards?.data
				?.filter((c) => c.status === "assigned" && c.vcard)
				.map((c) => c.vcard!.id) ?? [],
		);

		const availableVcards =
			vcardsData?.data?.filter(
				(v) => v.status === "active" && !assignedVcardIds.has(v.id),
			) ?? [];

		const selectedVcard = availableVcards.find((v) => v.id === selectedVcardId);

		const mutation = trpc.admin.physicalCard.assign.useMutation({
			onSuccess: () => {
				toast.success("Card assegnata");
				utils.admin.physicalCard.listOrgPhysicalCards.invalidate({
					organizationId,
				});
				modal.handleClose();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

		const handleAssign = () => {
			if (!selectedVcardId) return;
			mutation.mutate({ organizationId, cardId, vcardId: selectedVcardId });
		};

		return (
			<Sheet onOpenChange={modal.handleOpenChange} open={modal.visible}>
				<SheetContent onAnimationEndCapture={modal.handleAnimationEndCapture}>
					<SheetHeader>
						<SheetTitle>Assegna card fisica</SheetTitle>
						<SheetDescription>
							Assegna la card <strong>{cardCode}</strong> a una vCard
						</SheetDescription>
					</SheetHeader>
					<div className="px-4">
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" className="w-full justify-start">
									{selectedVcard
										? `${selectedVcard.first_name} ${selectedVcard.last_name}`
										: "Seleziona una vCard..."}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-full p-0" align="start">
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Cerca per nome..."
										value={search}
										onValueChange={setSearch}
									/>
									<CommandList>
										<CommandEmpty>Nessuna vCard disponibile</CommandEmpty>
										{availableVcards.map((v) => (
											<CommandItem
												key={v.id}
												value={v.id}
												onSelect={() => {
													setSelectedVcardId(v.id);
													setOpen(false);
												}}
											>
												{v.first_name} {v.last_name}
												{v.email && (
													<span className="ml-2 text-muted-foreground text-xs">
														{v.email}
													</span>
												)}
											</CommandItem>
										))}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
					<SheetFooter>
						<Button onClick={modal.handleClose} type="button" variant="outline">
							Annulla
						</Button>
						<Button
							disabled={!selectedVcardId}
							loading={mutation.isPending}
							onClick={handleAssign}
						>
							Assegna
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		);
	},
);

"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { updateOrganizationLimitsSchema } from "@/schemas/admin-vcard-schemas";
import { trpc } from "@/trpc/client";

interface OrgLimitsCardProps {
	organizationId: string;
	maxVcards: number;
	maxPhysicalCards: number;
}

export function OrgLimitsCard({
	organizationId,
	maxVcards,
	maxPhysicalCards,
}: OrgLimitsCardProps) {
	const form = useZodForm({
		schema: updateOrganizationLimitsSchema,
		defaultValues: {
			organizationId,
			maxVcards,
			maxPhysicalCards,
		},
	});

	const updateMutation = trpc.admin.physicalCard.updateLimits.useMutation({
		onSuccess: () => {
			toast.success("Limiti aggiornati");
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
				<Card>
					<CardHeader>
						<CardTitle>Limiti organizzazione</CardTitle>
						<CardDescription>
							Configura i limiti massimi per vCard e card fisiche.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="maxVcards"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Max vCard</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												onChange={(e) => field.onChange(Number(e.target.value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="maxPhysicalCards"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Max card fisiche</FormLabel>
										<FormControl>
											<Input
												type="number"
												{...field}
												onChange={(e) => field.onChange(Number(e.target.value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Salva limiti
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}

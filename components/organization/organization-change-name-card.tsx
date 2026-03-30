"use client";

import type * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useZodForm } from "@/hooks/use-zod-form";
import { changeOrganizationNameSchema } from "@/schemas/organization-schemas";
import { trpc } from "@/trpc/client";

/**
 * Card component for changing the organization name.
 * Uses the active organization from session.
 */
export function OrganizationChangeNameCard(): React.JSX.Element {
	const router = useProgressRouter();
	const utils = trpc.useUtils();
	const { data: organization } = useActiveOrganization();

	const methods = useZodForm({
		schema: changeOrganizationNameSchema,
		values: {
			name: organization?.name ?? "",
		},
	});

	const updateMutation = trpc.organization.management.update.useMutation({
		onSuccess: () => {
			toast.success("Il nome dell'organizzazione è stato aggiornato.");
			utils.organization.list.invalidate();
			router.refresh();
		},
		onError: () => {
			toast.error(
				"Non è stato possibile aggiornare il nome dell'organizzazione. Riprova più tardi.",
			);
		},
	});

	const onSubmit = methods.handleSubmit(async ({ name }) => {
		if (!organization) return;
		await updateMutation.mutateAsync({ name });
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Nome organizzazione</CardTitle>
				<CardDescription>
					Aggiorna il nome della tua organizzazione.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...methods}>
					<form className="flex flex-col space-y-4" onSubmit={onSubmit}>
						<FormField
							name="name"
							render={({ field }) => (
								<FormItem asChild>
									<Field>
										<FormLabel>Nome organizzazione</FormLabel>
										<FormControl>
											<Input
												placeholder={""}
												required
												autoComplete="organization"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</Field>
								</FormItem>
							)}
						/>
						<div>
							<Button
								className="w-full md:w-auto"
								disabled={
									!(
										methods.formState.isValid &&
										methods.formState.dirtyFields.name
									)
								}
								loading={methods.formState.isSubmitting}
								type="submit"
							>
								Aggiorna nome
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

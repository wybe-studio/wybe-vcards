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
 * Card component for changing the organization name and slug.
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
			slug: organization?.slug ?? "",
		},
	});

	const updateMutation = trpc.organization.management.update.useMutation({
		onSuccess: () => {
			toast.success(
				"Le impostazioni dell'organizzazione sono state aggiornate.",
			);
			utils.organization.list.invalidate();
			router.refresh();
		},
		onError: (error) => {
			if (error.data?.code === "CONFLICT") {
				toast.error("Questo slug è già in uso. Scegline un altro.");
			} else {
				toast.error(
					"Non è stato possibile aggiornare l'organizzazione. Riprova più tardi.",
				);
			}
		},
	});

	const onSubmit = methods.handleSubmit(async ({ name, slug }) => {
		if (!organization) return;
		await updateMutation.mutateAsync({ name, slug });
	});

	const isDirty =
		methods.formState.dirtyFields.name || methods.formState.dirtyFields.slug;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Nome organizzazione</CardTitle>
				<CardDescription>
					Aggiorna il nome e lo slug della tua organizzazione. Lo slug viene
					usato negli URL pubblici delle vCard.
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
												placeholder=""
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
						<FormField
							name="slug"
							render={({ field }) => (
								<FormItem asChild>
									<Field>
										<FormLabel>Slug (URL)</FormLabel>
										<FormControl>
											<Input placeholder="es. acme" required {...field} />
										</FormControl>
										<FormMessage />
									</Field>
								</FormItem>
							)}
						/>
						<div>
							<Button
								className="w-full md:w-auto"
								disabled={!(methods.formState.isValid && isDirty)}
								loading={methods.formState.isSubmitting}
								type="submit"
							>
								Salva modifiche
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

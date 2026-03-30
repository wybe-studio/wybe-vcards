"use client";

import type * as React from "react";
import { toast } from "sonner";
import { OrganizationRoleSelect } from "@/components/organization/organization-role-select";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
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
import { useZodForm } from "@/hooks/use-zod-form";
import { inviteMemberSchema } from "@/schemas/organization-schemas";
import { trpc } from "@/trpc/client";

/**
 * Card component for inviting members to the organization.
 * Uses the active organization from session.
 */
export function OrganizationInviteMemberCard(): React.JSX.Element {
	const { data: organization } = useActiveOrganization();
	const utils = trpc.useUtils();

	const inviteMember = trpc.organization.management.inviteMember.useMutation({
		onSuccess: () => {
			methods.reset();
			toast.success("Invito inviato con successo.");
			if (organization?.id) {
				utils.organization.get.invalidate({ id: organization.id });
			}
		},
		onError: (err) => {
			toast.error(err.message ?? "Qualcosa è andato storto. Riprova.");
		},
	});

	const methods = useZodForm({
		schema: inviteMemberSchema,
		defaultValues: {
			email: "",
			role: "member" as const,
		},
	});

	const onSubmit = methods.handleSubmit(async (values) => {
		if (!organization) return;
		inviteMember.mutate(values);
	});

	return (
		<Card>
			<CardHeader className="flex flex-row justify-between">
				<div className="flex flex-col space-y-1.5">
					<CardTitle>Invita membro</CardTitle>
					<CardDescription>
						Invia un invito a un compagno di team via email e assegnagli un
						ruolo.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent>
				<Form {...methods}>
					<form onSubmit={onSubmit} className="@container">
						<FieldGroup className="flex @md:flex-row flex-col gap-2">
							<div className="flex-1">
								<FormField
									control={methods.control}
									name="email"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Indirizzo email</FormLabel>
												<FormControl>
													<Input type="email" autoComplete="email" {...field} />
												</FormControl>
												<FormMessage />
											</Field>
										</FormItem>
									)}
								/>
							</div>
							<div>
								<FormField
									control={methods.control}
									name="role"
									render={({ field }) => (
										<FormItem asChild>
											<Field>
												<FormLabel>Ruolo</FormLabel>
												<FormControl>
													<OrganizationRoleSelect
														value={field.value ?? "member"}
														onSelect={field.onChange}
													/>
												</FormControl>
												<FormMessage />
											</Field>
										</FormItem>
									)}
								/>
							</div>
						</FieldGroup>
						<div className="mt-4">
							<Button type="submit" loading={inviteMember.isPending}>
								Invia invito
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

"use client";

import type * as React from "react";
import { toast } from "sonner";
import { PasswordFormMessage } from "@/components/auth/password-form-message";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { InputPassword } from "@/components/ui/custom/input-password";
import { Field } from "@/components/ui/field";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { useZodForm } from "@/hooks/use-zod-form";
import { createClient } from "@/lib/supabase/client";
import { changePasswordFormSchema } from "@/schemas/user-schemas";

export function ChangePasswordCard(): React.JSX.Element {
	const router = useProgressRouter();

	const methods = useZodForm({
		schema: changePasswordFormSchema,
		defaultValues: {
			currentPassword: "",
			newPassword: "",
		},
	});

	const onSubmit = methods.handleSubmit(async (values) => {
		const supabase = createClient();
		const { error } = await supabase.auth.updateUser({
			password: values.newPassword,
		});

		if (error) {
			toast.error("Impossibile aggiornare la password");
			return;
		}

		toast.success("Password aggiornata con successo");
		methods.reset({});
		router.refresh();
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Aggiorna la tua Password</CardTitle>
				<CardDescription>
					Aggiorna la password per mantenere sicuro il tuo account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...methods}>
					<form onSubmit={onSubmit}>
						<div className="grid grid-cols-1 gap-4">
							<FormField
								control={methods.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Password attuale</FormLabel>
											<FormControl>
												<InputPassword
													autoComplete="current-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							<FormField
								control={methods.control}
								name="newPassword"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Nuova password</FormLabel>
											<FormControl>
												<InputPassword autoComplete="new-password" {...field} />
											</FormControl>
											<PasswordFormMessage
												password={methods.watch("newPassword")}
											/>
										</Field>
									</FormItem>
								)}
							/>
							<div>
								<Button
									disabled={
										!(
											methods.formState.isValid &&
											Object.keys(methods.formState.dirtyFields).length
										)
									}
									loading={methods.formState.isSubmitting}
									type="submit"
								>
									Aggiorna Password
								</Button>
							</div>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

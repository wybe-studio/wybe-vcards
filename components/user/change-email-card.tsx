"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSession } from "@/hooks/use-session";
import { useZodForm } from "@/hooks/use-zod-form";
import { createClient } from "@/lib/supabase/client";
import { changeEmailSchema } from "@/schemas/user-schemas";

export function ChangeEmailCard(): React.JSX.Element {
	const { user, reloadSession } = useSession();
	const searchParams = useSearchParams();
	const [emailSent, setEmailSent] = React.useState(false);

	// Detect return from email change confirmation and refresh session
	const emailChanged = searchParams.get("email_changed") === "true";
	React.useEffect(() => {
		if (!emailChanged) return;
		const supabase = createClient();
		supabase.auth.refreshSession().then(() => {
			reloadSession();
			// Clean up URL param
			window.history.replaceState({}, "", "/dashboard/settings");
		});
	}, [emailChanged, reloadSession]);

	const methods = useZodForm({
		schema: changeEmailSchema,
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = methods.handleSubmit(async ({ email }) => {
		const supabase = createClient();
		const { error } = await supabase.auth.updateUser(
			{ email },
			{
				emailRedirectTo: `${window.location.origin}/dashboard/settings?email_changed=true`,
			},
		);

		if (error) {
			toast.error(error.message || "Impossibile aggiornare l'email");
			return;
		}

		setEmailSent(true);
		methods.reset();
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Aggiorna la tua Email</CardTitle>
				<CardDescription>
					Aggiorna l'indirizzo email che utilizzi per accedere al tuo account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{emailSent ? (
					<Alert variant="info">
						<AlertDescription>
							Un link di conferma è stato inviato alla tua nuova email. Clicca
							il link per completare la modifica.
						</AlertDescription>
					</Alert>
				) : (
					<Form {...methods}>
						<form
							className="space-y-4"
							onSubmit={(e) => {
								e.preventDefault();
								onSubmit();
							}}
						>
							<Field data-disabled="true">
								<FormLabel>Email attuale</FormLabel>
								<Input type="email" disabled value={user?.email ?? ""} />
							</Field>
							<FormField
								name="email"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Nuova Email</FormLabel>
											<FormControl>
												<Input
													required
													type="email"
													placeholder={""}
													autoComplete="email"
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
									type="submit"
									loading={methods.formState.isSubmitting}
									disabled={
										!(
											methods.formState.isValid &&
											methods.formState.dirtyFields.email
										)
									}
								>
									Aggiorna indirizzo Email
								</Button>
							</div>
						</form>
					</Form>
				)}
			</CardContent>
		</Card>
	);
}

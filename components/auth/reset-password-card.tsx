"use client";

import { LockIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { PasswordFormMessage } from "@/components/auth/password-form-message";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
} from "@/components/ui/form";
import { authConfig } from "@/config/auth.config";
import { useSession } from "@/hooks/use-session";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	getAuthErrorMessage,
	translateSupabaseError,
} from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/schemas/auth-schemas";

export function ResetPasswordCard(): React.JSX.Element {
	const { user } = useSession();
	const searchParams = useSearchParams();

	const methods = useZodForm({
		schema: resetPasswordSchema,
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = methods.handleSubmit(async ({ password }) => {
		try {
			const supabase = createClient();
			const { error } = await supabase.auth.updateUser({
				password,
			});

			if (error) {
				throw error;
			}

			if (user) {
				window.location.href = authConfig.redirectAfterSignIn;
			}
		} catch (e) {
			const errorMessage =
				e && typeof e === "object" && "message" in e
					? translateSupabaseError(e.message as string)
					: undefined;
			methods.setError("root", {
				message: errorMessage || getAuthErrorMessage(undefined),
			});
		}
	});

	return (
		<Card className="w-full border-transparent px-4 py-8 dark:border-border">
			<CardHeader>
				<CardTitle className="text-base lg:text-lg">
					Reimposta la tua password
				</CardTitle>
				<CardDescription>
					Usa il modulo qui sotto per cambiare la tua password.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{methods.formState.isSubmitSuccessful ? (
					<div className="flex flex-col items-center gap-4">
						<Alert variant="info" className="w-full">
							<AlertDescription>
								La tua password è stata reimpostata con successo.
							</AlertDescription>
						</Alert>
						<Button asChild className="w-full">
							<Link href="/auth/sign-in">Vai alla pagina di accesso</Link>
						</Button>
					</div>
				) : (
					<Form {...methods}>
						<form
							className="flex flex-col items-stretch gap-4"
							onSubmit={onSubmit}
						>
							<FormField
								control={methods.control}
								name="password"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Nuova password</FormLabel>
											<FormControl>
												<InputPassword
													autoCapitalize="off"
													autoComplete="new-password"
													disabled={methods.formState.isSubmitting}
													maxLength={72}
													placeholder="Inserisci la nuova password"
													startAdornment={
														<LockIcon className="size-4 shrink-0" />
													}
													{...field}
												/>
											</FormControl>
											<PasswordFormMessage
												password={methods.watch("password")}
											/>
										</Field>
									</FormItem>
								)}
							/>
							{methods.formState.errors.root && (
								<Alert variant="destructive">
									<AlertDescription>
										{methods.formState.errors.root.message}
									</AlertDescription>
								</Alert>
							)}
							<Button
								type="submit"
								className="w-full"
								loading={methods.formState.isSubmitting}
								disabled={methods.formState.isSubmitting}
							>
								{methods.formState.isSubmitting
									? "Reimpostazione..."
									: "Reimposta password"}
							</Button>
						</form>
					</Form>
				)}
			</CardContent>
			{!methods.formState.isSubmitSuccessful && (
				<CardFooter className="flex justify-center gap-1 text-muted-foreground text-sm">
					<span>Ricordi la tua password?</span>
					<Link className="text-foreground underline" href="/auth/sign-in">
						Accedi
					</Link>
				</CardFooter>
			)}
		</Card>
	);
}

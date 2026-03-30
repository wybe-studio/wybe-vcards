"use client";

import { MailIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@/components/ui/input-group";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	getAuthErrorMessage,
	translateSupabaseError,
} from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/schemas/auth-schemas";

export function ForgotPasswordCard(): React.JSX.Element {
	const methods = useZodForm({
		schema: forgotPasswordSchema,
		mode: "onSubmit",
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = methods.handleSubmit(async ({ email }) => {
		try {
			const supabase = createClient();
			const redirectTo = new URL(
				"/auth/reset-password",
				window.location.origin,
			).toString();

			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo,
			});
			if (error) {
				throw error;
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
					Password dimenticata?
				</CardTitle>
				<CardDescription>
					Nessun problema! Ti invieremo un link con le istruzioni per
					reimpostare la tua password.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{methods.formState.isSubmitSuccessful ? (
					<Alert variant="info">
						<AlertTitle>Link inviato</AlertTitle>
						<AlertDescription>
							Ti abbiamo inviato un link per continuare. Controlla la tua
							casella di posta.
						</AlertDescription>
					</Alert>
				) : (
					<Form {...methods}>
						<form className="flex flex-col gap-4" onSubmit={onSubmit}>
							<FormField
								control={methods.control}
								name="email"
								render={({ field }) => (
									<FormItem asChild>
										<Field>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<InputGroup
													className={field.disabled ? "opacity-50" : ""}
												>
													<InputGroupAddon align="inline-start">
														<InputGroupText>
															<MailIcon className="size-4 shrink-0" />
														</InputGroupText>
													</InputGroupAddon>
													<InputGroupInput
														{...field}
														autoCapitalize="off"
														autoComplete="username"
														disabled={methods.formState.isSubmitting}
														maxLength={255}
														type="email"
														placeholder="you@example.com"
													/>
												</InputGroup>
											</FormControl>
											<FormMessage />
										</Field>
									</FormItem>
								)}
							/>
							{methods.formState.errors.root && (
								<Alert variant="destructive">
									<AlertTitle>
										{methods.formState.errors.root.message}
									</AlertTitle>
								</Alert>
							)}
							<Button
								className="w-full"
								loading={methods.formState.isSubmitting}
								type="submit"
								disabled={methods.formState.isSubmitting}
							>
								{methods.formState.isSubmitting
									? "Invio in corso..."
									: "Invia istruzioni"}
							</Button>
						</form>
					</Form>
				)}
			</CardContent>
			<CardFooter className="flex justify-center gap-1 text-muted-foreground text-sm">
				<span>Ricordi la tua password?</span>
				<Link className="text-foreground underline" href="/auth/sign-in">
					Accedi
				</Link>
			</CardFooter>
		</Card>
	);
}

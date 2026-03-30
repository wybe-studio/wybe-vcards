"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
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
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { authConfig } from "@/config/auth.config";
import { useZodForm } from "@/hooks/use-zod-form";
import {
	getAuthErrorMessage,
	translateSupabaseError,
} from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/client";
import { otpSchema } from "@/schemas/auth-schemas";

export function OtpCard(): React.JSX.Element {
	const searchParams = useSearchParams();

	const invitationId = searchParams.get("invitationId");
	const redirectTo = searchParams.get("redirectTo");

	const redirectPath = invitationId
		? `/dashboard/organization-invitation/${invitationId}`
		: (redirectTo ?? authConfig.redirectAfterSignIn);

	const methods = useZodForm({
		schema: otpSchema,
		defaultValues: {
			code: "",
		},
	});

	const onSubmit = methods.handleSubmit(async ({ code }) => {
		try {
			const supabase = createClient();

			// Get the current MFA factors to find the TOTP factor
			const { data: factorsData, error: factorsError } =
				await supabase.auth.mfa.listFactors();
			if (factorsError) {
				throw factorsError;
			}

			const totpFactor = factorsData?.totp?.[0];
			if (!totpFactor) {
				throw new Error("No TOTP factor found. Please set up 2FA first.");
			}

			// Create a challenge for the TOTP factor
			const { data: challengeData, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
			if (challengeError) {
				throw challengeError;
			}

			// Verify the TOTP code
			const { error: verifyError } = await supabase.auth.mfa.verify({
				factorId: totpFactor.id,
				challengeId: challengeData.id,
				code,
			});
			if (verifyError) {
				throw verifyError;
			}

			window.location.href = redirectPath;
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
					Verifica il tuo account
				</CardTitle>
				<CardDescription>
					Inserisci il codice monouso dalla tua app di autenticazione per
					continuare.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...methods}>
					<form
						className="flex flex-col items-stretch gap-4"
						onSubmit={onSubmit}
					>
						<FormField
							control={methods.control}
							name="code"
							render={({ field }) => (
								<FormItem asChild>
									<Field>
										<FormLabel>Codice monouso</FormLabel>
										<FormControl>
											<InputOTP
												maxLength={6}
												{...field}
												autoComplete="one-time-code"
												onChange={(value) => {
													field.onChange(value);
													onSubmit();
												}}
											>
												<InputOTPGroup>
													<InputOTPSlot className="size-10 text-lg" index={0} />
													<InputOTPSlot className="size-10 text-lg" index={1} />
													<InputOTPSlot className="size-10 text-lg" index={2} />
												</InputOTPGroup>
												<InputOTPSeparator className="opacity-40" />
												<InputOTPGroup>
													<InputOTPSlot className="size-10 text-lg" index={3} />
													<InputOTPSlot className="size-10 text-lg" index={4} />
													<InputOTPSlot className="size-10 text-lg" index={5} />
												</InputOTPGroup>
											</InputOTP>
										</FormControl>
										<FormMessage />
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
						<Button loading={methods.formState.isSubmitting} type="submit">
							Verifica
						</Button>
					</form>
				</Form>
			</CardContent>
			<CardFooter className="flex justify-center gap-1 text-muted-foreground text-sm">
				<Link className="text-foreground underline" href="/auth/sign-in">
					Vai alla pagina di accesso
				</Link>
			</CardFooter>
		</Card>
	);
}

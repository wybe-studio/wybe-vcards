import { z } from "zod/v4";
import { passwordValidator } from "@/lib/auth/utils";

// Sign in form validation
export const signInSchema = z.object({
	email: z.string().trim().max(255, "Massimo 255 caratteri consentiti."),
	password: z.string().max(72, "Massimo 72 caratteri consentiti."),
});

// Sign up form validation
export const signUpSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Il nome è obbligatorio.")
		.max(64, "Massimo 64 caratteri consentiti."),
	email: z
		.string()
		.trim()
		.min(1, "L'email è obbligatoria.")
		.max(255, "Massimo 255 caratteri consentiti.")
		.email("Inserisci un indirizzo email valido."),
	password: z
		.string()
		.min(1, "La password è obbligatoria.")
		.max(72, "Massimo 72 caratteri consentiti.")
		.refine((arg) => passwordValidator.validate(arg).success, {
			message: "La password non soddisfa i requisiti.",
		}),
});

// OTP verification form
export const otpSchema = z.object({
	code: z.string().min(6).max(6),
});

// Forgot password form
export const forgotPasswordSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "L'email è obbligatoria.")
		.max(255, "Massimo 255 caratteri consentiti.")
		.email("Inserisci un indirizzo email valido."),
});

// Reset password form
export const resetPasswordSchema = z.object({
	password: z
		.string()
		.min(1, "La password è obbligatoria.")
		.max(72, "Massimo 72 caratteri consentiti.")
		.refine((arg) => passwordValidator.validate(arg).success, {
			message: "La password non soddisfa i requisiti.",
		}),
});

// Type exports
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

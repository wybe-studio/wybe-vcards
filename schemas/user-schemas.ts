import { z } from "zod/v4";
import { passwordValidator } from "@/lib/auth/utils";

// Change email form
export const changeEmailSchema = z.object({
	email: z.string().email(),
});

// Change name form
export const changeNameSchema = z.object({
	name: z.string().min(1).max(64),
});

// Change password form
export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "La password attuale è obbligatoria."),
	newPassword: z
		.string()
		.min(1, "La nuova password è obbligatoria.")
		.max(72, "Massimo 72 caratteri consentiti."),
});

// Change password form with validation
export const changePasswordFormSchema = z.object({
	currentPassword: z.string().min(1, "La password attuale è obbligatoria."),
	newPassword: z
		.string()
		.min(1, "La nuova password è obbligatoria.")
		.max(72, "Massimo 72 caratteri consentiti.")
		.refine((arg) => passwordValidator.validate(arg).success, {
			message: "La nuova password non soddisfa i requisiti.",
		}),
});

// Type exports
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangeNameInput = z.infer<typeof changeNameSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

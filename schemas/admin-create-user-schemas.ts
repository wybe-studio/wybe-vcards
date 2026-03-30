import { z } from "zod/v4";

export const createUserAdminSchema = z.object({
	email: z.email("Email non valida"),
	password: z
		.string()
		.min(8, "La password deve avere almeno 8 caratteri")
		.max(72),
	name: z.string().min(1, "Il nome è obbligatorio").max(200),
	role: z.enum(["user", "admin"]).default("user"),
});

export type CreateUserAdminInput = z.infer<typeof createUserAdminSchema>;

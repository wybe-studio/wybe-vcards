import { z } from "zod/v4";

export const createOrganizationAdminSchema = z.object({
	name: z.string().min(1, "Il nome è obbligatorio").max(200),
	ownerUserId: z.string().uuid("ID utente non valido"),
});

export const addMemberAdminSchema = z.object({
	organizationId: z.string().uuid("ID organizzazione non valido"),
	userId: z.string().uuid("ID utente non valido"),
	role: z.enum(["owner", "admin", "member"]).default("member"),
});

export type CreateOrganizationAdminInput = z.infer<
	typeof createOrganizationAdminSchema
>;
export type AddMemberAdminInput = z.infer<typeof addMemberAdminSchema>;

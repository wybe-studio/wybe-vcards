import { z } from "zod";

export const updateOrganizationProfileSchema = z.object({
	companyName: z.string().trim().max(200).optional().nullable(),
	vatNumber: z.string().trim().max(50).optional().nullable(),
	fiscalCode: z.string().trim().max(50).optional().nullable(),
	atecoCode: z.string().trim().max(20).optional().nullable(),
	sdiCode: z.string().trim().max(20).optional().nullable(),
	iban: z.string().trim().max(50).optional().nullable(),
	bankName: z.string().trim().max(200).optional().nullable(),
	pec: z
		.string()
		.trim()
		.email("PEC non valida")
		.max(255)
		.optional()
		.nullable()
		.or(z.literal("")),
	phone: z.string().trim().max(50).optional().nullable(),
	email: z
		.string()
		.trim()
		.email("Email non valida")
		.max(255)
		.optional()
		.nullable()
		.or(z.literal("")),
	website: z
		.string()
		.trim()
		.url("URL non valido")
		.max(500)
		.optional()
		.nullable()
		.or(z.literal("")),
	linkedinUrl: z
		.string()
		.trim()
		.url("URL non valido")
		.max(500)
		.optional()
		.nullable()
		.or(z.literal("")),
	facebookUrl: z
		.string()
		.trim()
		.url("URL non valido")
		.max(500)
		.optional()
		.nullable()
		.or(z.literal("")),
	instagramUrl: z
		.string()
		.trim()
		.url("URL non valido")
		.max(500)
		.optional()
		.nullable()
		.or(z.literal("")),
	address: z.string().trim().max(500).optional().nullable(),
	legalAddress: z.string().trim().max(500).optional().nullable(),
	adminContactName: z.string().trim().max(200).optional().nullable(),
	adminContactEmail: z
		.string()
		.trim()
		.email("Email non valida")
		.max(255)
		.optional()
		.nullable()
		.or(z.literal("")),
	notes: z.string().trim().max(2000).optional().nullable(),
});

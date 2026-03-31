import { z } from "zod";
import { VcardStatus } from "@/lib/enums";

const VcardSortField = z.enum([
	"first_name",
	"last_name",
	"email",
	"status",
	"created_at",
]);

export type VcardSortField = z.infer<typeof VcardSortField>;

export const listVcardsSchema = z.object({
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
	sortBy: VcardSortField.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	filters: z
		.object({
			status: z.array(z.nativeEnum(VcardStatus)).optional(),
		})
		.optional(),
});

export const createVcardSchema = z.object({
	firstName: z.string().trim().min(1, "Il nome e obbligatorio").max(100),
	lastName: z.string().trim().min(1, "Il cognome e obbligatorio").max(100),
	slug: z.string().trim().min(1).max(200).optional(),
	jobTitle: z.string().trim().max(200).optional(),
	email: z
		.string()
		.trim()
		.email("Email non valida")
		.max(255)
		.optional()
		.or(z.literal("")),
	phone: z.string().trim().max(50).optional(),
	phoneSecondary: z.string().trim().max(50).optional(),
	linkedinUrl: z
		.string()
		.trim()
		.url("URL non valido")
		.max(500)
		.optional()
		.or(z.literal("")),
	profileImage: z.string().trim().max(500).optional(),
	status: z.nativeEnum(VcardStatus).default("active"),
	userId: z.string().uuid().optional(),
});

export const updateVcardSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string().trim().min(1).max(100).optional(),
	lastName: z.string().trim().min(1).max(100).optional(),
	slug: z.string().trim().min(1).max(200).optional(),
	jobTitle: z.string().trim().max(200).optional().nullable(),
	email: z
		.string()
		.trim()
		.email()
		.max(255)
		.optional()
		.nullable()
		.or(z.literal("")),
	phone: z.string().trim().max(50).optional().nullable(),
	phoneSecondary: z.string().trim().max(50).optional().nullable(),
	linkedinUrl: z
		.string()
		.trim()
		.url()
		.max(500)
		.optional()
		.nullable()
		.or(z.literal("")),
	profileImage: z.string().trim().max(500).optional().nullable(),
	status: z.nativeEnum(VcardStatus).optional(),
	userId: z.string().uuid().optional().nullable(),
});

export const deleteVcardSchema = z.object({
	id: z.string().uuid(),
});

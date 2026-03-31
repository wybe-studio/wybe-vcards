import { z } from "zod";

export const generatePhysicalCardsBatchSchema = z.object({
	organizationId: z.string().uuid(),
	count: z.number().min(1).max(500),
});

export const updateOrganizationLimitsSchema = z.object({
	organizationId: z.string().uuid(),
	maxVcards: z.number().min(1).max(10000),
	maxPhysicalCards: z.number().min(1).max(10000),
});

export const listOrgVcardsAdminSchema = z.object({
	organizationId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
});

export const listOrgPhysicalCardsAdminSchema = z.object({
	organizationId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
});

export const adminUpdateVcardSchema = z.object({
	organizationId: z.string().uuid(),
	vcardId: z.string().uuid(),
	first_name: z.string().trim().min(1).max(100).optional(),
	last_name: z.string().trim().min(1).max(100).optional(),
	email: z
		.string()
		.trim()
		.email()
		.max(255)
		.nullable()
		.optional()
		.or(z.literal("")),
	phone: z.string().trim().max(50).nullable().optional(),
	job_title: z.string().trim().max(200).nullable().optional(),
	slug: z.string().trim().min(1).max(200).optional(),
	status: z.enum(["active", "suspended", "archived"]).optional(),
	user_id: z.string().uuid().nullable().optional(),
});

export const adminDeleteVcardSchema = z.object({
	organizationId: z.string().uuid(),
	vcardId: z.string().uuid(),
});

export const adminPhysicalCardActionSchema = z.object({
	organizationId: z.string().uuid(),
	cardId: z.string().uuid(),
});

export const adminAssignCardSchema = adminPhysicalCardActionSchema.extend({
	vcardId: z.string().uuid(),
});

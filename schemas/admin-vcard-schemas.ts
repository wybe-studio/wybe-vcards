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

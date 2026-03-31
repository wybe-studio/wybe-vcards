import { z } from "zod";
import { PhysicalCardStatus } from "@/lib/enums";

const PhysicalCardSortField = z.enum(["code", "status", "created_at"]);

export const listPhysicalCardsSchema = z.object({
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	query: z.string().optional(),
	sortBy: PhysicalCardSortField.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
	filters: z
		.object({
			status: z.array(z.nativeEnum(PhysicalCardStatus)).optional(),
		})
		.optional(),
});

export const assignPhysicalCardSchema = z.object({
	id: z.string().uuid(),
	vcardId: z.string().uuid(),
});

export const unassignPhysicalCardSchema = z.object({
	id: z.string().uuid(),
});

export const disablePhysicalCardSchema = z.object({
	id: z.string().uuid(),
});

export const enablePhysicalCardSchema = z.object({
	id: z.string().uuid(),
});

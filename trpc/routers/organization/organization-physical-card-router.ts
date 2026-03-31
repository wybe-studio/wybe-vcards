import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import {
	assignPhysicalCardSchema,
	disablePhysicalCardSchema,
	enablePhysicalCardSchema,
	listPhysicalCardsSchema,
	unassignPhysicalCardSchema,
} from "@/schemas/physical-card-schemas";
import { createTRPCRouter, protectedOrganizationProcedure } from "@/trpc/init";

export const organizationPhysicalCardRouter = createTRPCRouter({
	list: protectedOrganizationProcedure
		.input(listPhysicalCardsSchema)
		.query(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { limit, offset, query, sortBy, sortOrder, filters } = input;

			let dbQuery = ctx.supabase
				.from("physical_card")
				.select("*, vcard:vcard(id, first_name, last_name, slug)", {
					count: "exact",
				})
				.eq("organization_id", ctx.organization.id);

			if (query) {
				dbQuery = dbQuery.or(`code.ilike.%${query}%`);
			}

			if (filters?.status && filters.status.length > 0) {
				dbQuery = dbQuery.in("status", filters.status);
			}

			dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === "asc" });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list physical cards");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le card fisiche",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	assign: protectedOrganizationProcedure
		.input(assignPhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			// Verify the card belongs to this org and is free
			const { data: card } = await ctx.supabase
				.from("physical_card")
				.select("id, status")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status === "assigned") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Card gia assegnata. Scollegala prima di riassegnarla.",
				});
			}
			if (card.status === "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Card disattivata. Riattivala prima di assegnarla.",
				});
			}

			// Verify the vcard belongs to this org
			const { data: vcard } = await ctx.supabase
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata",
				});
			}

			// Check if vcard already has a card assigned
			const { data: existingCard } = await ctx.supabase
				.from("physical_card")
				.select("id")
				.eq("vcard_id", input.vcardId)
				.eq("status", "assigned")
				.maybeSingle();

			if (existingCard) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Questa vCard ha gia una card fisica assegnata. Scollega prima quella esistente.",
				});
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: input.vcardId, status: "assigned" })
				.eq("id", input.id);

			if (error) {
				logger.error({ error }, "Failed to assign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile assegnare la card",
				});
			}

			return { success: true };
		}),

	unassign: protectedOrganizationProcedure
		.input(unassignPhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to unassign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile scollegare la card",
				});
			}

			return { success: true };
		}),

	disable: protectedOrganizationProcedure
		.input(disablePhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ vcard_id: null, status: "disabled" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to disable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile disattivare la card",
				});
			}

			return { success: true };
		}),

	enable: protectedOrganizationProcedure
		.input(enablePhysicalCardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			const { error } = await ctx.supabase
				.from("physical_card")
				.update({ status: "free" })
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to enable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile riattivare la card",
				});
			}

			return { success: true };
		}),
});

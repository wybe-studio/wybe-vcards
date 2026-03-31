import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	adminAssignCardSchema,
	adminPhysicalCardActionSchema,
	generatePhysicalCardsBatchSchema,
	listOrgPhysicalCardsAdminSchema,
	listOrgVcardsAdminSchema,
	updateOrganizationLimitsSchema,
} from "@/schemas/admin-vcard-schemas";
import { createTRPCRouter, protectedAdminProcedure } from "@/trpc/init";

export const adminPhysicalCardRouter = createTRPCRouter({
	getOrgLimits: protectedAdminProcedure
		.input(z.object({ organizationId: z.string().uuid() }))
		.query(async ({ input }) => {
			const adminClient = createAdminClient();
			const { data, error } = await adminClient
				.from("organization")
				.select("id, name, max_vcards, max_physical_cards")
				.eq("id", input.organizationId)
				.single();

			if (error || !data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organizzazione non trovata",
				});
			}

			return data;
		}),

	generateBatch: protectedAdminProcedure
		.input(generatePhysicalCardsBatchSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			// Check org limit
			const { data: org } = await adminClient
				.from("organization")
				.select("max_physical_cards")
				.eq("id", input.organizationId)
				.single();

			if (!org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organizzazione non trovata",
				});
			}

			const { count: currentCount } = await adminClient
				.from("physical_card")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", input.organizationId);

			const remaining = org.max_physical_cards - (currentCount ?? 0);
			if (input.count > remaining) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Puoi generare al massimo ${remaining} card fisiche (limite: ${org.max_physical_cards}, attuali: ${currentCount ?? 0})`,
				});
			}

			// Use the SQL function for atomic batch generation
			const { data, error } = await adminClient.rpc(
				"generate_physical_cards_batch",
				{
					p_organization_id: input.organizationId,
					p_count: input.count,
				},
			);

			if (error) {
				logger.error({ error }, "Failed to generate physical cards batch");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile generare le card fisiche",
				});
			}

			return { generated: data };
		}),

	updateLimits: protectedAdminProcedure
		.input(updateOrganizationLimitsSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			const { error } = await adminClient
				.from("organization")
				.update({
					max_vcards: input.maxVcards,
					max_physical_cards: input.maxPhysicalCards,
				})
				.eq("id", input.organizationId);

			if (error) {
				logger.error({ error }, "Failed to update organization limits");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare i limiti",
				});
			}

			return { success: true };
		}),

	listOrgVcards: protectedAdminProcedure
		.input(listOrgVcardsAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();
			const { limit, offset, query, organizationId } = input;

			let dbQuery = adminClient
				.from("vcard")
				.select("*", { count: "exact" })
				.eq("organization_id", organizationId);

			if (query) {
				dbQuery = dbQuery.or(
					`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`,
				);
			}

			dbQuery = dbQuery.order("created_at", { ascending: false });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list org vcards (admin)");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le vCard",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	listOrgPhysicalCards: protectedAdminProcedure
		.input(listOrgPhysicalCardsAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();
			const { limit, offset, query, organizationId } = input;

			let dbQuery = adminClient
				.from("physical_card")
				.select("*, vcard:vcard(id, first_name, last_name)", { count: "exact" })
				.eq("organization_id", organizationId);

			if (query) {
				dbQuery = dbQuery.or(`code.ilike.%${query}%`);
			}

			dbQuery = dbQuery.order("created_at", { ascending: false });
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list org physical cards (admin)");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le card fisiche",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	assign: protectedAdminProcedure
		.input(adminAssignCardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org and is free
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
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

			// Verify vcard belongs to org
			const { data: vcard } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata",
				});
			}

			// Check vcard doesn't already have a card assigned
			const { data: existingCard } = await adminClient
				.from("physical_card")
				.select("id")
				.eq("vcard_id", input.vcardId)
				.eq("status", "assigned")
				.maybeSingle();

			if (existingCard) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa vCard ha gia una card fisica assegnata.",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: input.vcardId, status: "assigned" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to assign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile assegnare la card",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					cardId: input.cardId,
					vcardId: input.vcardId,
					action: "assign",
				},
				"Admin assigned physical card",
			);

			return { success: true };
		}),

	unassign: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status !== "assigned") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa card non e assegnata",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to unassign physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile scollegare la card",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					cardId: input.cardId,
					action: "unassign",
				},
				"Admin unassigned physical card",
			);

			return { success: true };
		}),

	disable: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status === "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Questa card e gia disattivata",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "disabled" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to disable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile disattivare la card",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					cardId: input.cardId,
					action: "disable",
				},
				"Admin disabled physical card",
			);

			return { success: true };
		}),

	enable: protectedAdminProcedure
		.input(adminPhysicalCardActionSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify card belongs to org
			const { data: card } = await adminClient
				.from("physical_card")
				.select("id, status")
				.eq("id", input.cardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (!card) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Card non trovata" });
			}
			if (card.status !== "disabled") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Solo le card disattivate possono essere riattivate",
				});
			}

			const { error } = await adminClient
				.from("physical_card")
				.update({ status: "free" })
				.eq("id", input.cardId);

			if (error) {
				logger.error({ error }, "Admin: failed to enable physical card");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile riattivare la card",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					cardId: input.cardId,
					action: "enable",
				},
				"Admin enabled physical card",
			);

			return { success: true };
		}),
});

import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	adminDeleteVcardSchema,
	adminUpdateVcardSchema,
} from "@/schemas/admin-vcard-schemas";
import { createTRPCRouter, protectedAdminProcedure } from "@/trpc/init";

export const adminVcardRouter = createTRPCRouter({
	update: protectedAdminProcedure
		.input(adminUpdateVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();
			const { organizationId, vcardId, ...data } = input;

			// Verify vcard belongs to this organization
			const { data: vcard, error: findError } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", vcardId)
				.eq("organization_id", organizationId)
				.single();

			if (findError || !vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata in questa organizzazione",
				});
			}

			// If slug is being changed, check uniqueness within org
			if (data.slug) {
				const { data: existing } = await adminClient
					.from("vcard")
					.select("id")
					.eq("organization_id", organizationId)
					.eq("slug", data.slug)
					.neq("id", vcardId)
					.maybeSingle();

				if (existing) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Questo slug e gia in uso in questa organizzazione",
					});
				}
			}

			const { error } = await adminClient
				.from("vcard")
				.update(data)
				.eq("id", vcardId);

			if (error) {
				logger.error({ error }, "Admin: failed to update vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare la vCard",
				});
			}

			logger.info(
				{ adminId: ctx.user.id, organizationId, vcardId, action: "update" },
				"Admin updated vcard",
			);

			return { success: true };
		}),

	delete: protectedAdminProcedure
		.input(adminDeleteVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify vcard belongs to this organization
			const { data: vcard, error: findError } = await adminClient
				.from("vcard")
				.select("id")
				.eq("id", input.vcardId)
				.eq("organization_id", input.organizationId)
				.single();

			if (findError || !vcard) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata in questa organizzazione",
				});
			}

			// Unassign any physical cards linked to this vcard
			await adminClient
				.from("physical_card")
				.update({ vcard_id: null, status: "free" })
				.eq("vcard_id", input.vcardId);

			const { error } = await adminClient
				.from("vcard")
				.delete()
				.eq("id", input.vcardId);

			if (error) {
				logger.error({ error }, "Admin: failed to delete vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile eliminare la vCard",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					organizationId: input.organizationId,
					vcardId: input.vcardId,
					action: "delete",
				},
				"Admin deleted vcard",
			);

			return { success: true };
		}),
});

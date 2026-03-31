import { TRPCError } from "@trpc/server";
import { logger } from "@/lib/logger";
import { updateOrganizationProfileSchema } from "@/schemas/organization-profile-schemas";
import { createTRPCRouter, protectedOrganizationProcedure } from "@/trpc/init";

export const organizationProfileRouter = createTRPCRouter({
	get: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("organization_profile")
			.select("*")
			.eq("organization_id", ctx.organization.id)
			.single();

		if (error) {
			logger.error({ error }, "Failed to fetch organization profile");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile caricare il profilo aziendale",
			});
		}

		return data;
	}),

	update: protectedOrganizationProcedure
		.input(updateOrganizationProfileSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono modificare il profilo aziendale",
				});
			}

			const { error } = await ctx.supabase
				.from("organization_profile")
				.update({
					company_name: input.companyName,
					vat_number: input.vatNumber,
					fiscal_code: input.fiscalCode,
					ateco_code: input.atecoCode,
					sdi_code: input.sdiCode,
					iban: input.iban,
					bank_name: input.bankName,
					pec: input.pec,
					phone: input.phone,
					email: input.email,
					website: input.website,
					linkedin_url: input.linkedinUrl,
					facebook_url: input.facebookUrl,
					instagram_url: input.instagramUrl,
					address: input.address,
					legal_address: input.legalAddress,
					admin_contact_name: input.adminContactName,
					admin_contact_email: input.adminContactEmail,
					notes: input.notes,
				})
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update organization profile");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare il profilo aziendale",
				});
			}

			return { success: true };
		}),
});

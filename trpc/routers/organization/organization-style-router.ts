import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { logger } from "@/lib/logger";
import { updateOrganizationStyleSchema } from "@/schemas/organization-style-schemas";
import { createTRPCRouter, protectedOrganizationProcedure } from "@/trpc/init";

export const organizationStyleRouter = createTRPCRouter({
	get: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("organization_style")
			.select("*")
			.eq("organization_id", ctx.organization.id)
			.single();

		if (error) {
			logger.error({ error }, "Failed to fetch organization style");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile caricare lo stile",
			});
		}

		return data;
	}),

	update: protectedOrganizationProcedure
		.input(updateOrganizationStyleSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono modificare lo stile",
				});
			}

			const { error } = await ctx.supabase
				.from("organization_style")
				.update({
					aurora_color_primary: input.auroraColorPrimary,
					aurora_color_secondary: input.auroraColorSecondary,
					header_bg_color: input.headerBgColor,
					header_text_color: input.headerTextColor,
					button_bg_color: input.buttonBgColor,
					button_text_color: input.buttonTextColor,
					tab_bg_color: input.tabBgColor,
					slug_format: input.slugFormat,
				})
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update organization style");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare lo stile",
				});
			}

			return { success: true };
		}),

	updateLogoWide: protectedOrganizationProcedure
		.input(z.object({ logoWide: z.string().nullable() }))
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role !== "owner" && ctx.membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono modificare lo stile",
				});
			}

			const { error } = await ctx.supabase
				.from("organization_style")
				.update({ logo_wide: input.logoWide })
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update logo wide");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare il logo",
				});
			}

			return { success: true };
		}),
});

import slugify from "@sindresorhus/slugify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { assertUserIsOrgMember } from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import {
	createOrganizationSchema,
	getOrganizationByIdSchema,
} from "@/schemas/organization-schemas";
import {
	createTRPCRouter,
	featureGuard,
	protectedProcedure,
} from "@/trpc/init";
import { organizationAiRouter } from "@/trpc/routers/organization/organization-ai-router";
import { organizationCreditRouter } from "@/trpc/routers/organization/organization-credit-router";
import { organizationLeadRouter } from "@/trpc/routers/organization/organization-lead-router";
import { organizationManagementRouter } from "@/trpc/routers/organization/organization-management-router";
import { organizationPhysicalCardRouter } from "@/trpc/routers/organization/organization-physical-card-router";
import { organizationProfileRouter } from "@/trpc/routers/organization/organization-profile-router";
import { organizationStyleRouter } from "@/trpc/routers/organization/organization-style-router";
import { organizationSubscriptionRouter } from "@/trpc/routers/organization/organization-subscription-router";
import { organizationVcardRouter } from "@/trpc/routers/organization/organization-vcard-router";

async function generateOrganizationSlug(
	supabase: SupabaseClient,
	name: string,
): Promise<string> {
	const baseSlug = slugify(name, {
		lowercase: true,
	});

	let slug = baseSlug;
	let hasAvailableSlug = false;

	for (let i = 0; i < 3; i++) {
		slug = `${baseSlug}-${nanoid(5)}`;

		const { data: existing } = await supabase
			.from("organization")
			.select("id")
			.eq("slug", slug)
			.maybeSingle();

		if (!existing) {
			hasAvailableSlug = true;
			break;
		}
	}

	if (!hasAvailableSlug) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Nessuno slug disponibile trovato",
		});
	}

	return slug;
}

export const organizationRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		// Get organizations the user is a member of
		const { data: memberships, error } = await ctx.supabase
			.from("member")
			.select("organization_id, organization:organization(*)")
			.eq("user_id", ctx.user.id);

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile elencare le organizzazioni",
			});
		}

		// Get member counts for each organization
		const orgIds = memberships?.map((m) => m.organization_id) ?? [];

		if (orgIds.length === 0) return [];

		// Fetch member counts per organization
		const orgsWithCounts = await Promise.all(
			(memberships ?? []).map(async (m) => {
				const { count } = await ctx.supabase
					.from("member")
					.select("*", { count: "exact", head: true })
					.eq("organization_id", m.organization_id);

				const org = m.organization;
				return {
					...org,
					slug: org?.slug ?? "",
					membersCount: count ?? 0,
				};
			}),
		);

		// Sort by created_at ascending
		orgsWithCounts.sort((a, b) => {
			const aDate = new Date(a.created_at ?? 0).getTime();
			const bDate = new Date(b.created_at ?? 0).getTime();
			return aDate - bDate;
		});

		return orgsWithCounts;
	}),
	get: protectedProcedure
		.input(getOrganizationByIdSchema)
		.query(async ({ ctx, input }) => {
			// Verify user is a member of this organization (throws if not)
			await assertUserIsOrgMember(input.id, ctx.user.id);

			// Fetch org with invitations (members fetched separately via RPC to get user metadata)
			const { data: organization, error } = await ctx.supabase
				.from("organization")
				.select("*, invitations:invitation(*)")
				.eq("id", input.id)
				.single();

			if (error || !organization) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organizzazione non trovata",
				});
			}

			// Fetch members with user metadata via RPC (PostgREST cannot join across schemas)
			const { data: membersData } = await ctx.supabase.rpc(
				"get_organization_members",
				{ p_organization_id: input.id },
			);

			const members = (membersData ?? []).map((m) => ({
				id: m.id,
				user_id: m.user_id,
				role: m.role as "owner" | "admin" | "member",
				organization_id: m.organization_id,
				created_at: m.created_at,
				updated_at: m.updated_at,
				user: {
					id: m.user_id,
					name: m.user_name,
					email: m.user_email,
					image: m.user_image,
				},
			}));

			return { ...organization, members };
		}),
	create: protectedProcedure
		.use(featureGuard("multiOrg"))
		.input(createOrganizationSchema)
		.mutation(async ({ ctx, input }) => {
			const slug = await generateOrganizationSlug(ctx.supabase, input.name);

			// Use SECURITY DEFINER RPC to bypass RLS chicken-and-egg problem:
			// user can't be a member before the org exists, but INSERT+SELECT policies
			// require membership to return the created row.
			const { data: organization, error: rpcError } = await ctx.supabase
				.rpc("create_organization_with_owner", {
					p_name: input.name,
					p_slug: slug,
					p_user_id: ctx.user.id,
					p_metadata: input.metadata
						? JSON.stringify(input.metadata)
						: undefined,
				})
				.single();

			if (rpcError || !organization) {
				logger.error(
					{ rpcError, input: { name: input.name, slug } },
					"Failed to create organization",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare l'organizzazione",
				});
			}

			return organization;
		}),

	// Context-specific sub-routers
	ai: organizationAiRouter,
	credit: organizationCreditRouter,
	lead: organizationLeadRouter,
	management: organizationManagementRouter,
	physicalCard: organizationPhysicalCardRouter,
	profile: organizationProfileRouter,
	style: organizationStyleRouter,
	subscription: organizationSubscriptionRouter,
	vcard: organizationVcardRouter,
});

import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import {
	createVcardSchema,
	deleteVcardSchema,
	listVcardsSchema,
	updateVcardSchema,
} from "@/schemas/vcard-schemas";
import { createTRPCRouter, protectedOrganizationProcedure } from "@/trpc/init";

export const organizationVcardRouter = createTRPCRouter({
	stats: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const orgId = ctx.organization.id;

		// vCard counts by status
		const [activeRes, suspendedRes, archivedRes] = await Promise.all([
			ctx.supabase
				.from("vcard")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", orgId)
				.eq("status", "active"),
			ctx.supabase
				.from("vcard")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", orgId)
				.eq("status", "suspended"),
			ctx.supabase
				.from("vcard")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", orgId)
				.eq("status", "archived"),
		]);

		// Physical card counts by status (admin+ only)
		const isAdmin = ctx.membership.role !== "member";
		let physicalCards = { free: 0, assigned: 0, disabled: 0 };

		if (isAdmin) {
			const [freeRes, assignedRes, disabledRes] = await Promise.all([
				ctx.supabase
					.from("physical_card")
					.select("*", { count: "exact", head: true })
					.eq("organization_id", orgId)
					.eq("status", "free"),
				ctx.supabase
					.from("physical_card")
					.select("*", { count: "exact", head: true })
					.eq("organization_id", orgId)
					.eq("status", "assigned"),
				ctx.supabase
					.from("physical_card")
					.select("*", { count: "exact", head: true })
					.eq("organization_id", orgId)
					.eq("status", "disabled"),
			]);

			physicalCards = {
				free: freeRes.count ?? 0,
				assigned: assignedRes.count ?? 0,
				disabled: disabledRes.count ?? 0,
			};
		}

		// Member count
		const { count: membersCount } = await ctx.supabase
			.from("member")
			.select("*", { count: "exact", head: true })
			.eq("organization_id", orgId);

		// Recent vCards (last 5)
		const { data: recentVcards } = await ctx.supabase
			.from("vcard")
			.select("id, first_name, last_name, job_title, status, created_at, slug")
			.eq("organization_id", orgId)
			.order("created_at", { ascending: false })
			.limit(5);

		const maxVcards =
			(ctx.organization as { max_vcards?: number }).max_vcards ?? 10;
		const maxPhysicalCards =
			(ctx.organization as { max_physical_cards?: number })
				.max_physical_cards ?? 0;

		return {
			vcards: {
				active: activeRes.count ?? 0,
				suspended: suspendedRes.count ?? 0,
				archived: archivedRes.count ?? 0,
				total:
					(activeRes.count ?? 0) +
					(suspendedRes.count ?? 0) +
					(archivedRes.count ?? 0),
				max: maxVcards,
			},
			physicalCards,
			members: membersCount ?? 0,
			recentVcards: recentVcards ?? [],
			isAdmin,
			maxPhysicalCards,
		};
	}),

	list: protectedOrganizationProcedure
		.input(listVcardsSchema)
		.query(async ({ ctx, input }) => {
			const { limit, offset, query, sortBy, sortOrder, filters } = input;
			const orgId = ctx.organization.id;
			const isMember = ctx.membership.role === "member";

			let dbQuery = ctx.supabase
				.from("vcard")
				.select("*, physical_card(id, code, status)", { count: "exact" })
				.eq("organization_id", orgId);

			// Members see only their own vCard
			if (isMember) {
				dbQuery = dbQuery.eq("user_id", ctx.user.id);
			}

			// Text search
			if (query) {
				dbQuery = dbQuery.or(
					`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,job_title.ilike.%${query}%`,
				);
			}

			// Filters
			if (filters?.status && filters.status.length > 0) {
				dbQuery = dbQuery.in("status", filters.status);
			}

			// Sorting
			dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === "asc" });

			// Pagination
			dbQuery = dbQuery.range(offset, offset + limit - 1);

			const { data, error, count } = await dbQuery;

			if (error) {
				logger.error({ error }, "Failed to list vcards");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile caricare le vCard",
				});
			}

			return { data: data ?? [], total: count ?? 0 };
		}),

	get: protectedOrganizationProcedure
		.input(deleteVcardSchema) // reuses { id: uuid }
		.query(async ({ ctx, input }) => {
			const { data, error } = await ctx.supabase
				.from("vcard")
				.select("*")
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (error || !data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "vCard non trovata",
				});
			}

			// Members can only see their own
			if (ctx.membership.role === "member" && data.user_id !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}

			return data;
		}),

	create: protectedOrganizationProcedure
		.input(createVcardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono creare vCard",
				});
			}

			const orgId = ctx.organization.id;

			// Check vCard limit
			const { count } = await ctx.supabase
				.from("vcard")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", orgId);

			const maxVcards =
				(ctx.organization as { max_vcards?: number }).max_vcards ?? 10;
			if ((count ?? 0) >= maxVcards) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limite di ${maxVcards} vCard raggiunto per questa organizzazione`,
				});
			}

			// Generate slug if not provided
			let slug = input.slug;
			if (!slug) {
				// Get org style for slug format preference
				const { data: style } = await ctx.supabase
					.from("organization_style")
					.select("slug_format")
					.eq("organization_id", orgId)
					.single();

				if (style?.slug_format === "uuid") {
					slug = nanoid(12);
				} else {
					const base = slugify(`${input.firstName} ${input.lastName}`, {
						lowercase: true,
						separator: ".",
					});
					slug = base;

					// Check uniqueness within org
					const { data: existing } = await ctx.supabase
						.from("vcard")
						.select("id")
						.eq("organization_id", orgId)
						.eq("slug", slug)
						.maybeSingle();

					if (existing) {
						slug = `${base}-${nanoid(4)}`;
					}
				}
			}

			const { data, error } = await ctx.supabase
				.from("vcard")
				.insert({
					organization_id: orgId,
					first_name: input.firstName,
					last_name: input.lastName,
					slug,
					job_title: input.jobTitle ?? null,
					email: input.email || null,
					phone: input.phone ?? null,
					phone_secondary: input.phoneSecondary ?? null,
					linkedin_url: input.linkedinUrl || null,
					profile_image: input.profileImage ?? null,
					status: input.status,
					user_id: input.userId ?? null,
				})
				.select()
				.single();

			if (error) {
				logger.error({ error }, "Failed to create vcard");
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Esiste gia una vCard con questo slug nell'organizzazione",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare la vCard",
				});
			}

			return data;
		}),

	update: protectedOrganizationProcedure
		.input(updateVcardSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updates } = input;

			// Check ownership for members
			if (ctx.membership.role === "member") {
				const { data: existing } = await ctx.supabase
					.from("vcard")
					.select("user_id")
					.eq("id", id)
					.eq("organization_id", ctx.organization.id)
					.single();

				if (!existing || existing.user_id !== ctx.user.id) {
					throw new TRPCError({ code: "FORBIDDEN" });
				}

				// Members cannot change status or user_id
				delete (updates as Record<string, unknown>).status;
				delete (updates as Record<string, unknown>).userId;
			}

			const updateData: Record<string, unknown> = {};
			if (updates.firstName !== undefined)
				updateData.first_name = updates.firstName;
			if (updates.lastName !== undefined)
				updateData.last_name = updates.lastName;
			if (updates.slug !== undefined) updateData.slug = updates.slug;
			if (updates.jobTitle !== undefined)
				updateData.job_title = updates.jobTitle;
			if (updates.email !== undefined) updateData.email = updates.email || null;
			if (updates.phone !== undefined) updateData.phone = updates.phone;
			if (updates.phoneSecondary !== undefined)
				updateData.phone_secondary = updates.phoneSecondary;
			if (updates.linkedinUrl !== undefined)
				updateData.linkedin_url = updates.linkedinUrl || null;
			if (updates.profileImage !== undefined)
				updateData.profile_image = updates.profileImage;
			if (updates.status !== undefined) updateData.status = updates.status;
			if (updates.userId !== undefined) updateData.user_id = updates.userId;

			const { error } = await ctx.supabase
				.from("vcard")
				.update(updateData)
				.eq("id", id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to update vcard");
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Esiste gia una vCard con questo slug",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare la vCard",
				});
			}

			return { success: true };
		}),

	delete: protectedOrganizationProcedure
		.input(deleteVcardSchema)
		.mutation(async ({ ctx, input }) => {
			if (ctx.membership.role === "member") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo admin e owner possono eliminare vCard",
				});
			}

			const { error } = await ctx.supabase
				.from("vcard")
				.delete()
				.eq("id", input.id)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				logger.error({ error }, "Failed to delete vcard");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile eliminare la vCard",
				});
			}

			return { success: true };
		}),
});

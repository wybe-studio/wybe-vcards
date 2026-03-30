import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { adjustCredits as adjustCreditsLib } from "@/lib/billing/credits";
import {
	cancelSubscriptionAtPeriodEnd,
	cancelSubscriptionImmediately,
} from "@/lib/billing/subscriptions";
import {
	syncOrganizationOrders,
	syncOrganizationSubscriptions,
} from "@/lib/billing/sync";
import { LoggerFactory } from "@/lib/logger/factory";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	addMemberAdminSchema,
	createOrganizationAdminSchema,
} from "@/schemas/admin-create-organization-schemas";
import {
	adjustCreditsAdminSchema,
	cancelSubscriptionAdminSchema,
	deleteOrganizationAdminSchema,
	exportOrganizationsAdminSchema,
	listOrganizationsAdminSchema,
} from "@/schemas/admin-organization-schemas";
import {
	createTRPCRouter,
	featureGuard,
	protectedAdminProcedure,
} from "@/trpc/init";

const logger = LoggerFactory.getLogger("admin-organization");

export const adminOrganizationRouter = createTRPCRouter({
	list: protectedAdminProcedure
		.input(listOrganizationsAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();

			// Build query for organizations
			let query = adminClient
				.from("organization")
				.select("*", { count: "exact" });

			// Text search on name
			if (input.query) {
				query = query.ilike("name", `%${input.query}%`);
			}

			// Date filter
			if (input.filters?.createdAt?.length) {
				const now = new Date();
				// Build OR conditions for date ranges
				// Supabase doesn't support OR directly on the same column easily,
				// so we compute date bounds and use the widest range
				let minDate: Date | null = null;
				let maxDate: Date | null = null;
				let hasOlder = false;

				for (const range of input.filters.createdAt) {
					switch (range) {
						case "today": {
							const start = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate(),
							);
							if (!minDate || start < minDate) minDate = start;
							break;
						}
						case "this-week": {
							const weekStart = new Date(
								now.getFullYear(),
								now.getMonth(),
								now.getDate() - now.getDay(),
							);
							if (!minDate || weekStart < minDate) minDate = weekStart;
							break;
						}
						case "this-month": {
							const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
							if (!minDate || monthStart < minDate) minDate = monthStart;
							break;
						}
						case "older": {
							hasOlder = true;
							const monthAgo = new Date(
								now.getFullYear(),
								now.getMonth() - 1,
								now.getDate(),
							);
							maxDate = monthAgo;
							break;
						}
					}
				}

				// If we have both older and recent filters, skip date filter (too broad)
				if (hasOlder && minDate) {
					// Both old and new requested - no filter needed
				} else if (hasOlder && maxDate) {
					query = query.lte("created_at", maxDate.toISOString());
				} else if (minDate) {
					query = query.gte("created_at", minDate.toISOString());
				}
			}

			// Sort
			const ascending = input.sortOrder !== "desc";
			const sortColumn = input.sortBy === "createdAt" ? "created_at" : "name";
			query = query.order(sortColumn, { ascending });

			// Pagination
			query = query.range(input.offset, input.offset + input.limit - 1);

			const { data: organizations, error: orgError, count } = await query;

			if (orgError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to list organizations: ${orgError.message}`,
				});
			}

			if (!organizations || organizations.length === 0) {
				return { organizations: [], total: count ?? 0 };
			}

			const orgIds = organizations.map((o) => o.id);

			// Fetch related data in parallel
			const [
				membersResult,
				subscriptionsResult,
				creditBalancesResult,
				invitationsResult,
			] = await Promise.all([
				// Member counts
				adminClient
					.from("member")
					.select("organization_id", { count: "exact", head: false })
					.in("organization_id", orgIds),
				// Latest subscription per org
				adminClient
					.from("subscription")
					.select(
						"id, organization_id, status, stripe_price_id, trial_end, cancel_at_period_end, created_at",
					)
					.in("organization_id", orgIds)
					.order("created_at", { ascending: false }),
				// Credit balances
				adminClient
					.from("credit_balance")
					.select("organization_id, balance")
					.in("organization_id", orgIds),
				// Pending invitations
				adminClient
					.from("invitation")
					.select("organization_id")
					.in("organization_id", orgIds)
					.eq("status", "pending"),
			]);

			// Count members per org
			const memberCountMap = new Map<string, number>();
			if (membersResult.data) {
				for (const m of membersResult.data) {
					const orgId = m.organization_id;
					memberCountMap.set(orgId, (memberCountMap.get(orgId) ?? 0) + 1);
				}
			}

			// Get latest subscription per org (first one per org from sorted results)
			const subMap = new Map<
				string,
				NonNullable<typeof subscriptionsResult.data>[number]
			>();
			if (subscriptionsResult.data) {
				for (const sub of subscriptionsResult.data) {
					if (!subMap.has(sub.organization_id)) {
						subMap.set(sub.organization_id, sub);
					}
				}
			}

			// Credit balance map
			const creditMap = new Map<string, number>();
			if (creditBalancesResult.data) {
				for (const cb of creditBalancesResult.data) {
					creditMap.set(cb.organization_id, cb.balance);
				}
			}

			// Pending invitations count per org
			const pendingMap = new Map<string, number>();
			if (invitationsResult.data) {
				for (const inv of invitationsResult.data) {
					const orgId = inv.organization_id;
					pendingMap.set(orgId, (pendingMap.get(orgId) ?? 0) + 1);
				}
			}

			// Apply subscription status filter (post-query since it's a join)
			let filteredOrgs = organizations;
			if (input.filters?.subscriptionStatus?.length) {
				const statuses = input.filters.subscriptionStatus;
				filteredOrgs = filteredOrgs.filter((o) => {
					const sub = subMap.get(o.id);
					return sub && statuses.includes(sub.status);
				});
			}

			// Apply balance range filter (post-query)
			if (input.filters?.balanceRange?.length) {
				filteredOrgs = filteredOrgs.filter((o) => {
					const balance = creditMap.get(o.id) ?? 0;
					for (const range of input.filters!.balanceRange!) {
						switch (range) {
							case "zero":
								if (balance === 0) return true;
								break;
							case "low":
								if (balance >= 1 && balance <= 1000) return true;
								break;
							case "medium":
								if (balance >= 1001 && balance <= 50000) return true;
								break;
							case "high":
								if (balance >= 50001) return true;
								break;
						}
					}
					return false;
				});
			}

			// Apply member count filter (post-query)
			if (input.filters?.membersCount?.length) {
				filteredOrgs = filteredOrgs.filter((o) => {
					const memberCount = memberCountMap.get(o.id) ?? 0;
					for (const range of input.filters!.membersCount!) {
						if (range === "0" && memberCount === 0) return true;
						if (range === "1-5" && memberCount >= 1 && memberCount <= 5)
							return true;
						if (range === "6-10" && memberCount >= 6 && memberCount <= 10)
							return true;
						if (range === "11+" && memberCount > 10) return true;
					}
					return false;
				});
			}

			const shaped = filteredOrgs.map((o) => {
				const sub = subMap.get(o.id);
				return {
					id: o.id,
					name: o.name,
					logo: o.logo,
					createdAt: o.created_at,
					metadata: o.metadata,
					membersCount: memberCountMap.get(o.id) ?? 0,
					pendingInvites: pendingMap.get(o.id) ?? 0,
					subscriptionStatus: sub?.status ?? null,
					subscriptionPlan: sub?.stripe_price_id ?? null,
					subscriptionId: sub?.id ?? null,
					cancelAtPeriodEnd: sub?.cancel_at_period_end ?? null,
					trialEnd: sub?.trial_end ?? null,
					credits: creditMap.get(o.id) ?? null,
				};
			});

			return { organizations: shaped, total: count ?? 0 };
		}),

	delete: protectedAdminProcedure
		.input(deleteOrganizationAdminSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			const { error } = await adminClient
				.from("organization")
				.delete()
				.eq("id", input.id);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to delete organization: ${error.message}`,
				});
			}
		}),

	exportSelectedToCsv: protectedAdminProcedure
		.input(exportOrganizationsAdminSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			const { data: organizations, error: orgError } = await adminClient
				.from("organization")
				.select("*")
				.in("id", input.organizationIds);

			if (orgError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to fetch organizations: ${orgError.message}`,
				});
			}

			if (!organizations || organizations.length === 0) {
				const Papa = await import("papaparse");
				return Papa.unparse([]);
			}

			const orgIds = organizations.map((o) => o.id);

			const [
				membersResult,
				subscriptionsResult,
				creditBalancesResult,
				invitationsResult,
			] = await Promise.all([
				adminClient
					.from("member")
					.select("organization_id")
					.in("organization_id", orgIds),
				adminClient
					.from("subscription")
					.select("organization_id, status, stripe_price_id, created_at")
					.in("organization_id", orgIds)
					.order("created_at", { ascending: false }),
				adminClient
					.from("credit_balance")
					.select("organization_id, balance")
					.in("organization_id", orgIds),
				adminClient
					.from("invitation")
					.select("organization_id")
					.in("organization_id", orgIds)
					.eq("status", "pending"),
			]);

			const memberCountMap = new Map<string, number>();
			if (membersResult.data) {
				for (const m of membersResult.data) {
					memberCountMap.set(
						m.organization_id,
						(memberCountMap.get(m.organization_id) ?? 0) + 1,
					);
				}
			}

			const subMap = new Map<
				string,
				{ status: string; stripe_price_id: string }
			>();
			if (subscriptionsResult.data) {
				for (const sub of subscriptionsResult.data) {
					if (!subMap.has(sub.organization_id)) {
						subMap.set(sub.organization_id, sub);
					}
				}
			}

			const creditMap = new Map<string, number>();
			if (creditBalancesResult.data) {
				for (const cb of creditBalancesResult.data) {
					creditMap.set(cb.organization_id, cb.balance);
				}
			}

			const pendingMap = new Map<string, number>();
			if (invitationsResult.data) {
				for (const inv of invitationsResult.data) {
					pendingMap.set(
						inv.organization_id,
						(pendingMap.get(inv.organization_id) ?? 0) + 1,
					);
				}
			}

			const flattened = organizations.map((org) => {
				const sub = subMap.get(org.id);
				return {
					id: org.id,
					name: org.name,
					membersCount: memberCountMap.get(org.id) ?? 0,
					pendingInvites: pendingMap.get(org.id) ?? 0,
					subscriptionStatus: sub?.status ?? null,
					subscriptionPlan: sub?.stripe_price_id ?? null,
					credits: creditMap.get(org.id) ?? 0,
					createdAt: org.created_at,
					updatedAt: org.updated_at,
				};
			});

			const Papa = await import("papaparse");
			return Papa.unparse(flattened);
		}),

	exportSelectedToExcel: protectedAdminProcedure
		.input(exportOrganizationsAdminSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			const { data: organizations, error: orgError } = await adminClient
				.from("organization")
				.select("*")
				.in("id", input.organizationIds);

			if (orgError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to fetch organizations: ${orgError.message}`,
				});
			}

			const orgIds = (organizations ?? []).map((o) => o.id);

			const [
				membersResult,
				subscriptionsResult,
				creditBalancesResult,
				invitationsResult,
			] = await Promise.all([
				adminClient
					.from("member")
					.select("organization_id")
					.in("organization_id", orgIds),
				adminClient
					.from("subscription")
					.select("organization_id, status, stripe_price_id, created_at")
					.in("organization_id", orgIds)
					.order("created_at", { ascending: false }),
				adminClient
					.from("credit_balance")
					.select("organization_id, balance")
					.in("organization_id", orgIds),
				adminClient
					.from("invitation")
					.select("organization_id")
					.in("organization_id", orgIds)
					.eq("status", "pending"),
			]);

			const memberCountMap = new Map<string, number>();
			if (membersResult.data) {
				for (const m of membersResult.data) {
					memberCountMap.set(
						m.organization_id,
						(memberCountMap.get(m.organization_id) ?? 0) + 1,
					);
				}
			}

			const subMap = new Map<
				string,
				{ status: string; stripe_price_id: string }
			>();
			if (subscriptionsResult.data) {
				for (const sub of subscriptionsResult.data) {
					if (!subMap.has(sub.organization_id)) {
						subMap.set(sub.organization_id, sub);
					}
				}
			}

			const creditMap = new Map<string, number>();
			if (creditBalancesResult.data) {
				for (const cb of creditBalancesResult.data) {
					creditMap.set(cb.organization_id, cb.balance);
				}
			}

			const pendingMap = new Map<string, number>();
			if (invitationsResult.data) {
				for (const inv of invitationsResult.data) {
					pendingMap.set(
						inv.organization_id,
						(pendingMap.get(inv.organization_id) ?? 0) + 1,
					);
				}
			}

			const ExcelJS = await import("exceljs");
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Organizations");

			if (organizations && organizations.length > 0) {
				worksheet.columns = [
					{ header: "ID", key: "id", width: 40 },
					{ header: "Name", key: "name", width: 30 },
					{ header: "Members", key: "membersCount", width: 15 },
					{ header: "Pending Invites", key: "pendingInvites", width: 15 },
					{ header: "Plan", key: "subscriptionPlan", width: 20 },
					{ header: "Status", key: "subscriptionStatus", width: 15 },
					{ header: "Credits", key: "credits", width: 15 },
					{ header: "Created At", key: "createdAt", width: 25 },
					{ header: "Updated At", key: "updatedAt", width: 25 },
				];

				for (const org of organizations) {
					const sub = subMap.get(org.id);
					worksheet.addRow({
						id: org.id,
						name: org.name,
						membersCount: memberCountMap.get(org.id) ?? 0,
						pendingInvites: pendingMap.get(org.id) ?? 0,
						subscriptionPlan: sub?.stripe_price_id ?? null,
						subscriptionStatus: sub?.status ?? null,
						credits: creditMap.get(org.id) ?? 0,
						createdAt: org.created_at,
						updatedAt: org.updated_at,
					});
				}
			}

			const buffer = await workbook.xlsx.writeBuffer();
			return Buffer.from(buffer).toString("base64");
		}),

	/**
	 * Sync selected organizations' subscriptions from Stripe
	 * Fetches fresh data from Stripe based on customer ID and updates local database
	 */
	syncFromStripe: protectedAdminProcedure
		.use(featureGuard("billing"))
		.input(exportOrganizationsAdminSchema)
		.mutation(async ({ input, ctx }) => {
			logger.info(
				{
					organizationIds: input.organizationIds,
					adminId: ctx.user.id,
				},
				"Admin triggered manual sync from Stripe",
			);

			const [subscriptionResult, orderResult] = await Promise.all([
				syncOrganizationSubscriptions(input.organizationIds),
				syncOrganizationOrders(input.organizationIds),
			]);

			// Granular logging of results
			const subFailures = subscriptionResult.results.filter((r) => !r.success);
			const orderFailures = orderResult.results.filter((r) => !r.success);

			if (subFailures.length > 0 || orderFailures.length > 0) {
				logger.warn(
					{
						subFailures: subFailures.map((r) => ({
							id: r.organizationId,
							error: r.error,
						})),
						orderFailures: orderFailures.map((r) => ({
							id: r.organizationId,
							error: r.error,
						})),
					},
					"Some organizations failed to sync from Stripe",
				);
			}

			if (subscriptionResult.successful > 0 || orderResult.successful > 0) {
				logger.info(
					{
						subscriptionsSynced: subscriptionResult.successful,
						ordersSynced: orderResult.successful,
					},
					"Stripe sync completed successfully for some/all organizations",
				);
			}

			return {
				subscriptions: subscriptionResult,
				orders: orderResult,
			};
		}),

	/**
	 * Adjust organization credits (admin action)
	 */
	adjustCredits: protectedAdminProcedure
		.use(featureGuard("billing"))
		.input(adjustCreditsAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify organization exists
			const { data: org, error: orgError } = await adminClient
				.from("organization")
				.select("id")
				.eq("id", input.organizationId)
				.single();

			if (orgError || !org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organization not found",
				});
			}

			const transaction = await adjustCreditsLib({
				organizationId: input.organizationId,
				amount: input.amount,
				description: input.description,
				createdBy: ctx.user.id,
				metadata: {
					adjustedByAdmin: ctx.user.id,
					adjustedByEmail: ctx.user.email,
				},
			});

			return {
				success: true,
				newBalance: transaction.balance_after,
				transactionId: transaction.id,
			};
		}),

	/**
	 * Cancel an organization's subscription (admin action)
	 */
	cancelSubscription: protectedAdminProcedure
		.use(featureGuard("billing"))
		.input(cancelSubscriptionAdminSchema)
		.mutation(async ({ input, ctx }) => {
			const { subscriptionId, immediate } = input;

			logger.info(
				{ subscriptionId, immediate, adminId: ctx.user.id },
				"Admin canceling subscription",
			);

			if (immediate) {
				await cancelSubscriptionImmediately(subscriptionId);
			} else {
				await cancelSubscriptionAtPeriodEnd(subscriptionId);
			}

			// The webhook will handle updating the local database

			return {
				success: true,
				immediate,
			};
		}),

	createOrganization: protectedAdminProcedure
		.input(createOrganizationAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify the owner user exists
			const { data: ownerAuth, error: ownerError } =
				await adminClient.auth.admin.getUserById(input.ownerUserId);

			if (ownerError || !ownerAuth.user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Utente proprietario non trovato",
				});
			}

			// Generate unique slug
			const baseSlug = slugify(input.name, { lowercase: true });
			const slug = `${baseSlug}-${nanoid(5)}`;

			// Admin client bypasses RLS, so we can insert directly
			// (the RPC uses auth.uid() which is NULL for service_role)
			const { data: organization, error: orgError } = await adminClient
				.from("organization")
				.insert({ name: input.name, slug })
				.select()
				.single();

			if (orgError || !organization) {
				logger.error(
					{ orgError, input },
					"Admin failed to create organization",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare l'organizzazione",
				});
			}

			// Add the specified user as owner
			const { error: memberError } = await adminClient.from("member").insert({
				organization_id: organization.id,
				user_id: input.ownerUserId,
				role: "owner",
			});

			if (memberError) {
				// Cleanup: delete the org if member creation fails
				await adminClient
					.from("organization")
					.delete()
					.eq("id", organization.id);
				logger.error(
					{ memberError, organizationId: organization.id },
					"Failed to add owner member",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile assegnare il proprietario",
				});
			}

			// Initialize credit balance
			await adminClient
				.from("credit_balance")
				.insert({ organization_id: organization.id })
				.single();

			logger.info(
				{
					adminId: ctx.user.id,
					adminEmail: ctx.user.email,
					organizationId: organization.id,
					organizationName: input.name,
					ownerId: input.ownerUserId,
				},
				"Admin created new organization",
			);

			return organization;
		}),

	addMember: protectedAdminProcedure
		.input(addMemberAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Verify user exists
			const { data: userAuth, error: userError } =
				await adminClient.auth.admin.getUserById(input.userId);

			if (userError || !userAuth.user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Utente non trovato",
				});
			}

			// Verify organization exists
			const { data: org } = await adminClient
				.from("organization")
				.select("id")
				.eq("id", input.organizationId)
				.single();

			if (!org) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Organizzazione non trovata",
				});
			}

			// Check if user is already a member
			const { data: existingMember } = await adminClient
				.from("member")
				.select("id")
				.eq("organization_id", input.organizationId)
				.eq("user_id", input.userId)
				.maybeSingle();

			if (existingMember) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "L'utente è già membro di questa organizzazione",
				});
			}

			// Insert member
			const { data: member, error: memberError } = await adminClient
				.from("member")
				.insert({
					organization_id: input.organizationId,
					user_id: input.userId,
					role: input.role,
				})
				.select()
				.single();

			if (memberError || !member) {
				logger.error(
					{ memberError, input },
					"Admin failed to add member to organization",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiungere il membro",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					adminEmail: ctx.user.email,
					organizationId: input.organizationId,
					userId: input.userId,
					role: input.role,
				},
				"Admin added member to organization",
			);

			return member;
		}),
});

import slugify from "@sindresorhus/slugify";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { featuresConfig } from "@/config/features.config";
import type { UserRole } from "@/lib/enums";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserAdminSchema } from "@/schemas/admin-create-user-schemas";
import {
	banUserAdminSchema,
	exportUsersAdminSchema,
	listUsersAdminSchema,
	unbanUserAdminSchema,
} from "@/schemas/admin-user-schemas";
import { createTRPCRouter, protectedAdminProcedure } from "@/trpc/init";

/**
 * Map snake_case user data (joined from user_profile + auth) to camelCase for export.
 */
function mapUserForExport(user: {
	id: string;
	name: string | null;
	email: string | null;
	email_verified: boolean;
	role: string;
	banned: boolean;
	onboarding_complete: boolean;
	two_factor_enabled: boolean;
	created_at: string;
	updated_at: string;
}) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		emailVerified: user.email_verified,
		role: user.role,
		banned: user.banned,
		onboardingComplete: user.onboarding_complete,
		twoFactorEnabled: user.two_factor_enabled,
		createdAt: user.created_at,
		updatedAt: user.updated_at,
	};
}

export const adminUserRouter = createTRPCRouter({
	list: protectedAdminProcedure
		.input(listUsersAdminSchema)
		.query(async ({ input }) => {
			const adminClient = createAdminClient();

			// Fetch all auth users to get email/name (admin API)
			// We'll merge with user_profile data
			const { data: authData, error: authError } =
				await adminClient.auth.admin.listUsers({
					page: 1,
					perPage: 10000, // Get all users for filtering
				});

			if (authError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to list auth users: ${authError.message}`,
				});
			}

			// Fetch all user profiles
			const { data: profiles, error: profileError } = await adminClient
				.from("user_profile")
				.select("*");

			if (profileError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to list user profiles: ${profileError.message}`,
				});
			}

			// Build a map of profiles by ID
			const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

			// Merge auth users with profiles
			let merged = (authData?.users ?? []).map((authUser) => {
				const profile = profileMap.get(authUser.id);
				return {
					id: authUser.id,
					name:
						authUser.user_metadata?.name ??
						authUser.user_metadata?.full_name ??
						null,
					email: authUser.email ?? null,
					emailVerified: !!authUser.email_confirmed_at,
					role: profile?.role ?? "user",
					banned: profile?.banned ?? false,
					banReason: profile?.ban_reason ?? null,
					banExpires: profile?.ban_expires ?? null,
					onboardingComplete: profile?.onboarding_complete ?? false,
					twoFactorEnabled: !!authUser.factors?.some(
						(f) => f.status === "verified",
					),
					createdAt: authUser.created_at,
					updatedAt:
						profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
				};
			});

			// Apply filters
			if (input.query) {
				const q = input.query.toLowerCase();
				merged = merged.filter(
					(u) =>
						(u.name && u.name.toLowerCase().includes(q)) ||
						(u.email && u.email.toLowerCase().includes(q)),
				);
			}

			if (input.filters?.role?.length) {
				merged = merged.filter((u) =>
					input.filters!.role!.includes(u.role as UserRole),
				);
			}

			if (input.filters?.emailVerified?.length) {
				merged = merged.filter((u) => {
					for (const status of input.filters!.emailVerified!) {
						if (status === "verified" && u.emailVerified) return true;
						if (status === "pending" && !u.emailVerified) return true;
					}
					return false;
				});
			}

			if (input.filters?.banned?.length) {
				merged = merged.filter((u) => {
					for (const status of input.filters!.banned!) {
						if (status === "banned" && u.banned) return true;
						if (status === "active" && !u.banned) return true;
					}
					return false;
				});
			}

			if (input.filters?.createdAt?.length) {
				const now = new Date();
				merged = merged.filter((u) => {
					const created = new Date(u.createdAt);
					for (const range of input.filters!.createdAt!) {
						switch (range) {
							case "today": {
								const start = new Date(
									now.getFullYear(),
									now.getMonth(),
									now.getDate(),
								);
								const end = new Date(
									now.getFullYear(),
									now.getMonth(),
									now.getDate() + 1,
								);
								if (created >= start && created < end) return true;
								break;
							}
							case "this-week": {
								const weekStart = new Date(
									now.getFullYear(),
									now.getMonth(),
									now.getDate() - now.getDay(),
								);
								if (created >= weekStart) return true;
								break;
							}
							case "this-month": {
								const monthStart = new Date(
									now.getFullYear(),
									now.getMonth(),
									1,
								);
								if (created >= monthStart) return true;
								break;
							}
							case "older": {
								const monthAgo = new Date(
									now.getFullYear(),
									now.getMonth() - 1,
									now.getDate(),
								);
								if (created <= monthAgo) return true;
								break;
							}
						}
					}
					return false;
				});
			}

			// Sort
			const order = input.sortOrder === "desc" ? -1 : 1;
			const sortBy = input.sortBy ?? "createdAt";
			merged.sort((a, b) => {
				const aVal = a[sortBy as keyof typeof a] ?? "";
				const bVal = b[sortBy as keyof typeof b] ?? "";
				if (aVal < bVal) return -1 * order;
				if (aVal > bVal) return 1 * order;
				return 0;
			});

			const total = merged.length;

			// Paginate
			const users = merged.slice(input.offset, input.offset + input.limit);

			return { users, total };
		}),
	exportSelectedToCsv: protectedAdminProcedure
		.input(exportUsersAdminSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			// Fetch auth users for selected IDs
			const userResults = await Promise.all(
				input.userIds.map((id) => adminClient.auth.admin.getUserById(id)),
			);

			// Fetch profiles for selected IDs
			const { data: profiles } = await adminClient
				.from("user_profile")
				.select("*")
				.in("id", input.userIds);

			const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

			const users = userResults
				.filter((r) => r.data?.user)
				.map((r) => {
					const authUser = r.data!.user!;
					const profile = profileMap.get(authUser.id);
					return mapUserForExport({
						id: authUser.id,
						name:
							authUser.user_metadata?.name ??
							authUser.user_metadata?.full_name ??
							null,
						email: authUser.email ?? null,
						email_verified: !!authUser.email_confirmed_at,
						role: profile?.role ?? "user",
						banned: profile?.banned ?? false,
						onboarding_complete: profile?.onboarding_complete ?? false,
						two_factor_enabled: !!authUser.factors?.some(
							(f) => f.status === "verified",
						),
						created_at: authUser.created_at,
						updated_at:
							profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
					});
				});

			const Papa = await import("papaparse");
			const csv = Papa.unparse(users);
			return csv;
		}),
	exportSelectedToExcel: protectedAdminProcedure
		.input(exportUsersAdminSchema)
		.mutation(async ({ input }) => {
			const adminClient = createAdminClient();

			// Fetch auth users for selected IDs
			const userResults = await Promise.all(
				input.userIds.map((id) => adminClient.auth.admin.getUserById(id)),
			);

			// Fetch profiles for selected IDs
			const { data: profiles } = await adminClient
				.from("user_profile")
				.select("*")
				.in("id", input.userIds);

			const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

			const users = userResults
				.filter((r) => r.data?.user)
				.map((r) => {
					const authUser = r.data!.user!;
					const profile = profileMap.get(authUser.id);
					return mapUserForExport({
						id: authUser.id,
						name:
							authUser.user_metadata?.name ??
							authUser.user_metadata?.full_name ??
							null,
						email: authUser.email ?? null,
						email_verified: !!authUser.email_confirmed_at,
						role: profile?.role ?? "user",
						banned: profile?.banned ?? false,
						onboarding_complete: profile?.onboarding_complete ?? false,
						two_factor_enabled: !!authUser.factors?.some(
							(f) => f.status === "verified",
						),
						created_at: authUser.created_at,
						updated_at:
							profile?.updated_at ?? authUser.updated_at ?? authUser.created_at,
					});
				});

			const ExcelJS = await import("exceljs");
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Users");

			if (users.length > 0) {
				const columns = [
					{ header: "ID", key: "id", width: 40 },
					{ header: "Name", key: "name", width: 25 },
					{ header: "Email", key: "email", width: 30 },
					{ header: "Email Verified", key: "emailVerified", width: 15 },
					{ header: "Role", key: "role", width: 15 },
					{ header: "Banned", key: "banned", width: 10 },
					{
						header: "Onboarding Complete",
						key: "onboardingComplete",
						width: 20,
					},
					{ header: "2FA Enabled", key: "twoFactorEnabled", width: 15 },
					{ header: "Created At", key: "createdAt", width: 25 },
					{ header: "Updated At", key: "updatedAt", width: 25 },
				];
				worksheet.columns = columns;
				for (const user of users) {
					worksheet.addRow(user);
				}
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const base64 = Buffer.from(buffer).toString("base64");
			return base64;
		}),
	banUser: protectedAdminProcedure
		.input(banUserAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Check if user exists
			const { data: targetProfile, error: profileError } = await adminClient
				.from("user_profile")
				.select("*")
				.eq("id", input.userId)
				.single();

			if (profileError || !targetProfile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			// Get email from auth for logging
			const { data: authData } = await adminClient.auth.admin.getUserById(
				input.userId,
			);
			const targetEmail = authData?.user?.email ?? "unknown";

			// Prevent banning yourself
			if (targetProfile.id === ctx.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You cannot ban yourself",
				});
			}

			// Check if user is already banned
			if (targetProfile.banned) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User is already banned",
				});
			}

			// Update user with ban information
			const { error: updateError } = await adminClient
				.from("user_profile")
				.update({
					banned: true,
					ban_reason: input.reason,
					ban_expires: input.expiresAt ? input.expiresAt.toISOString() : null,
				})
				.eq("id", input.userId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to ban user: ${updateError.message}`,
				});
			}

			// Log ban operation for monitoring/debugging
			logger.info(
				{
					action: "user_banned",
					targetUserId: input.userId,
					targetUserEmail: targetEmail,
					adminUserId: ctx.user.id,
					adminUserEmail: ctx.user.email,
					reason: input.reason,
					expiresAt: input.expiresAt || null,
				},
				"Admin banned user",
			);
		}),
	unbanUser: protectedAdminProcedure
		.input(unbanUserAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Check if user exists
			const { data: targetProfile, error: profileError } = await adminClient
				.from("user_profile")
				.select("*")
				.eq("id", input.userId)
				.single();

			if (profileError || !targetProfile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			// Get email from auth for logging
			const { data: authData } = await adminClient.auth.admin.getUserById(
				input.userId,
			);
			const targetEmail = authData?.user?.email ?? "unknown";

			// Check if user is not banned
			if (!targetProfile.banned) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User is not banned",
				});
			}

			// Update user to remove ban
			const { error: updateError } = await adminClient
				.from("user_profile")
				.update({
					banned: false,
					ban_reason: null,
					ban_expires: null,
				})
				.eq("id", input.userId);

			if (updateError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to unban user: ${updateError.message}`,
				});
			}

			// Log unban operation for monitoring/debugging
			logger.info(
				{
					action: "user_unbanned",
					targetUserId: input.userId,
					targetUserEmail: targetEmail,
					adminUserId: ctx.user.id,
					adminUserEmail: ctx.user.email,
					previousBanReason: targetProfile.ban_reason,
				},
				"Admin unbanned user",
			);
		}),
	createUser: protectedAdminProcedure
		.input(createUserAdminSchema)
		.mutation(async ({ ctx, input }) => {
			const adminClient = createAdminClient();

			// Create user via Supabase Admin API (bypasses signup restrictions)
			const { data: authData, error: authError } =
				await adminClient.auth.admin.createUser({
					email: input.email,
					password: input.password,
					email_confirm: true,
					user_metadata: {
						name: input.name,
						onboardingComplete: !featuresConfig.onboarding,
					},
				});

			if (authError || !authData.user) {
				logger.error(
					{ error: authError, adminEmail: ctx.user.email },
					"Admin failed to create user",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: authError?.message ?? "Impossibile creare l'utente",
				});
			}

			// Update user_profile record (trigger on_auth_user_created already inserts a row)
			const { error: profileError } = await adminClient
				.from("user_profile")
				.update({
					role: input.role,
					onboarding_complete: !featuresConfig.onboarding,
				})
				.eq("id", authData.user.id);

			if (profileError) {
				logger.error(
					{ error: profileError, userId: authData.user.id },
					"Failed to create user_profile after auth user creation",
				);
				// Clean up: delete the auth user since profile creation failed
				await adminClient.auth.admin.deleteUser(authData.user.id);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare il profilo utente",
				});
			}

			logger.info(
				{
					adminId: ctx.user.id,
					adminEmail: ctx.user.email,
					createdUserId: authData.user.id,
					createdEmail: input.email,
					role: input.role,
				},
				"Admin created new user",
			);

			// Auto-create personal organization if personalAccountOnly is enabled
			if (featuresConfig.personalAccountOnly) {
				try {
					const name = (input.name || input.email.split("@")[0]) as string;
					const slug = `${slugify(name, { lowercase: true })}-${nanoid(5)}`;

					await adminClient.rpc("create_organization_with_owner", {
						p_name: name,
						p_slug: slug,
						p_user_id: authData.user.id,
						p_metadata: undefined,
					});
				} catch (orgError) {
					logger.error(
						{ error: orgError, userId: authData.user.id },
						"Failed to auto-create personal organization for admin-created user",
					);
				}
			}

			return {
				id: authData.user.id,
				email: authData.user.email,
				name: input.name,
				role: input.role,
			};
		}),
});

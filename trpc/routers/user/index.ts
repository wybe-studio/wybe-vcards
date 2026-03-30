import { TRPCError } from "@trpc/server";
import {
	getActiveSessions,
	getSession,
	getUserAccounts,
} from "@/lib/auth/server";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/trpc/init";

export const userRouter = createTRPCRouter({
	getSession: publicProcedure.query(async () => await getSession()),
	getActiveSessions: protectedProcedure.query(
		async () => await getActiveSessions(),
	),
	getAccounts: protectedProcedure.query(async () => await getUserAccounts()),

	deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.user.id;

		// Check if user is owner of any organization
		const { data: ownedOrgs } = await ctx.supabase
			.from("member")
			.select("organization:organization_id(name)")
			.eq("user_id", userId)
			.eq("role", "owner");

		if (ownedOrgs && ownedOrgs.length > 0) {
			const orgNames = ownedOrgs
				.map((m) => {
					const org = m.organization;
					return org && !Array.isArray(org)
						? (org as { name: string }).name
						: "Organizzazione";
				})
				.join(", ");

			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Non puoi eliminare il tuo account perché sei proprietario di: ${orgNames}. Trasferisci la proprietà o elimina le organizzazioni prima di procedere.`,
			});
		}

		// Remove memberships
		const { error: memberError } = await ctx.supabase
			.from("member")
			.delete()
			.eq("user_id", userId);

		if (memberError) {
			logger.error(
				{ error: memberError, userId },
				"Failed to delete memberships",
			);
		}

		// Remove user_profile
		const adminClient = createAdminClient();
		const { error: profileError } = await adminClient
			.from("user_profile")
			.delete()
			.eq("id", userId);

		if (profileError) {
			logger.error(
				{ error: profileError, userId },
				"Failed to delete user_profile",
			);
		}

		// Delete auth user
		const { error: authError } =
			await adminClient.auth.admin.deleteUser(userId);

		if (authError) {
			logger.error({ error: authError, userId }, "Failed to delete auth user");
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile eliminare l'account. Riprova.",
			});
		}

		logger.info({ userId }, "User account deleted");
		return { success: true };
	}),
});

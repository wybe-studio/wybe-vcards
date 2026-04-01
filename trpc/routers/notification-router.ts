import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

/**
 * Notification router — currently handles organization invitations only.
 * To add new notification types: add a new query procedure per type,
 * or extend listMyInvitations to return a union of notification shapes.
 * Consider extracting to a NotificationProvider if types exceed 2-3.
 */
export const notificationRouter = createTRPCRouter({
	listMyInvitations: protectedProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("invitation")
			.select(
				"id, email, role, status, created_at, expires_at, organization:organization(id, name, logo)",
			)
			.eq("email", ctx.user.email)
			.eq("status", "pending")
			.order("created_at", { ascending: false });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile recuperare gli inviti",
			});
		}

		return data ?? [];
	}),
});

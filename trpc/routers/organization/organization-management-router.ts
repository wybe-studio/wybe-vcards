import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { appConfig } from "@/config/app.config";
import { sendOrganizationInvitationEmail } from "@/lib/email/emails";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	inviteMemberSchema,
	updateOrganizationSchema,
} from "@/schemas/organization-schemas";
import {
	createTRPCRouter,
	protectedOrganizationProcedure,
	protectedProcedure,
} from "@/trpc/init";

/**
 * Organization management router.
 * Handles CRUD operations on the active organization:
 * update, delete, invite/cancel/accept invitations, member role updates, member removal.
 */

function assertOrgAdmin(role: string) {
	if (role !== "owner" && role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Solo i proprietari e gli admin dell'organizzazione possono eseguire questa azione",
		});
	}
}

function assertOrgOwner(role: string) {
	if (role !== "owner") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Solo il proprietario dell'organizzazione può eseguire questa azione",
		});
	}
}

export const organizationManagementRouter = createTRPCRouter({
	/**
	 * Update organization name/metadata
	 */
	update: protectedOrganizationProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100).trim().optional(),
				metadata: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertOrgAdmin(ctx.membership.role);

			const updateData: Record<string, unknown> = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.metadata !== undefined) updateData.metadata = input.metadata;

			const { data, error } = await ctx.supabase
				.from("organization")
				.update(updateData)
				.eq("id", ctx.organization.id)
				.select()
				.single();

			if (error) {
				logger.error(
					{ error, orgId: ctx.organization.id },
					"Failed to update organization",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare l'organizzazione",
				});
			}

			return data;
		}),

	/**
	 * Update organization logo URL
	 */
	updateLogo: protectedOrganizationProcedure
		.input(z.object({ logo: z.string().nullable() }))
		.mutation(async ({ ctx, input }) => {
			assertOrgAdmin(ctx.membership.role);

			const { data, error } = await ctx.supabase
				.from("organization")
				.update({ logo: input.logo })
				.eq("id", ctx.organization.id)
				.select()
				.single();

			if (error) {
				logger.error(
					{ error, orgId: ctx.organization.id },
					"Failed to update organization logo",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile aggiornare il logo dell'organizzazione",
				});
			}

			return data;
		}),

	/**
	 * Delete organization (owner only)
	 */
	delete: protectedOrganizationProcedure.mutation(async ({ ctx }) => {
		assertOrgOwner(ctx.membership.role);

		// Use admin client to bypass the prevent_owner_removal trigger.
		// All child tables (member, invitation, lead, etc.) use ON DELETE CASCADE,
		// so deleting the organization cleans up everything automatically.
		const adminClient = createAdminClient();

		const { error } = await adminClient
			.from("organization")
			.delete()
			.eq("id", ctx.organization.id);

		if (error) {
			logger.error(
				{ error, orgId: ctx.organization.id },
				"Failed to delete organization",
			);
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile eliminare l'organizzazione",
			});
		}

		return { success: true };
	}),

	/**
	 * Invite a member to the organization
	 */
	inviteMember: protectedOrganizationProcedure
		.input(inviteMemberSchema)
		.mutation(async ({ ctx, input }) => {
			assertOrgAdmin(ctx.membership.role);

			// Check if user is already a member (by email → look up auth user)
			// For now, check if there's already a pending invitation
			const { data: existingInvite } = await ctx.supabase
				.from("invitation")
				.select("id")
				.eq("organization_id", ctx.organization.id)
				.eq("email", input.email)
				.eq("status", "pending")
				.maybeSingle();

			if (existingInvite) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Un invito è già stato inviato a questa email",
				});
			}

			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

			const { data, error } = await ctx.supabase
				.from("invitation")
				.insert({
					organization_id: ctx.organization.id,
					email: input.email,
					role: input.role,
					inviter_id: ctx.user.id,
					expires_at: expiresAt.toISOString(),
				})
				.select()
				.single();

			if (error) {
				logger.error(
					{ error, orgId: ctx.organization.id },
					"Failed to create invitation",
				);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile creare l'invito",
				});
			}

			// Send invitation email (fire-and-forget, don't block the response)
			sendOrganizationInvitationEmail({
				recipient: input.email,
				appName: appConfig.appName,
				invitedByName: ctx.user.name ?? ctx.user.email,
				invitedByEmail: ctx.user.email,
				organizationName: ctx.organization.name,
				inviteLink: `${appConfig.baseUrl}/dashboard/organization-invitation/${data.id}`,
			}).catch((err) => {
				logger.error(
					{ error: err, email: input.email, orgId: ctx.organization.id },
					"Failed to send invitation email",
				);
			});

			return data;
		}),

	/**
	 * Cancel a pending invitation
	 */
	cancelInvitation: protectedOrganizationProcedure
		.input(z.object({ invitationId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			assertOrgAdmin(ctx.membership.role);

			const { error } = await ctx.supabase
				.from("invitation")
				.delete()
				.eq("id", input.invitationId)
				.eq("organization_id", ctx.organization.id)
				.eq("status", "pending");

			if (error) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invito non trovato o già elaborato",
				});
			}

			return { success: true };
		}),

	/**
	 * Accept an invitation (for the current user)
	 */
	acceptInvitation: protectedProcedure
		.input(z.object({ invitationId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			// Use SECURITY DEFINER RPC: the user is not yet an org member,
			// so RLS would block direct INSERT on member and UPDATE on invitation.
			const { data: organizationId, error } = await ctx.supabase.rpc(
				"accept_invitation",
				{ p_invitation_id: input.invitationId },
			);

			if (error) {
				logger.error(
					{ error, invitationId: input.invitationId },
					"Failed to accept invitation",
				);
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}

			return { success: true, organizationId };
		}),

	/**
	 * Reject an invitation (for the current user)
	 */
	rejectInvitation: protectedProcedure
		.input(z.object({ invitationId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const { error } = await ctx.supabase.rpc("reject_invitation", {
				p_invitation_id: input.invitationId,
			});

			if (error) {
				logger.error(
					{ error, invitationId: input.invitationId },
					"Failed to reject invitation",
				);
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.message,
				});
			}

			return { success: true };
		}),

	/**
	 * Update a member's role
	 */
	updateMemberRole: protectedOrganizationProcedure
		.input(
			z.object({
				memberId: z.string().uuid(),
				role: z.enum(["member", "admin"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			assertOrgOwner(ctx.membership.role);

			// Cannot change own role
			if (input.memberId === ctx.membership.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Non puoi modificare il tuo stesso ruolo",
				});
			}

			const { data, error } = await ctx.supabase
				.from("member")
				.update({ role: input.role })
				.eq("id", input.memberId)
				.eq("organization_id", ctx.organization.id)
				.select()
				.single();

			if (error || !data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membro non trovato",
				});
			}

			return data;
		}),

	/**
	 * Remove a member from the organization
	 */
	removeMember: protectedOrganizationProcedure
		.input(z.object({ memberId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			assertOrgAdmin(ctx.membership.role);

			// Cannot remove yourself
			if (input.memberId === ctx.membership.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Non puoi rimuovere te stesso. Usa la funzione di abbandono.",
				});
			}

			// Check target member exists and isn't the owner
			const { data: targetMember } = await ctx.supabase
				.from("member")
				.select("role")
				.eq("id", input.memberId)
				.eq("organization_id", ctx.organization.id)
				.single();

			if (!targetMember) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membro non trovato",
				});
			}

			// Only owner can remove admins
			if (targetMember.role === "admin" && ctx.membership.role !== "owner") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Solo il proprietario può rimuovere gli admin",
				});
			}

			// Cannot remove the owner
			if (targetMember.role === "owner") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Non è possibile rimuovere il proprietario dell'organizzazione",
				});
			}

			const { error } = await ctx.supabase
				.from("member")
				.delete()
				.eq("id", input.memberId)
				.eq("organization_id", ctx.organization.id);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile rimuovere il membro",
				});
			}

			return { success: true };
		}),

	/**
	 * Leave an organization (current user)
	 */
	leave: protectedOrganizationProcedure.mutation(async ({ ctx }) => {
		// Owner cannot leave - must transfer ownership first
		if (ctx.membership.role === "owner") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Il proprietario dell'organizzazione non può abbandonarla. Trasferisci prima la proprietà.",
			});
		}

		const { error } = await ctx.supabase
			.from("member")
			.delete()
			.eq("id", ctx.membership.id)
			.eq("organization_id", ctx.organization.id);

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile abbandonare l'organizzazione",
			});
		}

		return { success: true };
	}),

	/**
	 * List members of the active organization
	 */
	listMembers: protectedOrganizationProcedure.query(async ({ ctx }) => {
		const { data, error } = await ctx.supabase
			.from("member")
			.select("*, user_profile:user_profile(*)")
			.eq("organization_id", ctx.organization.id)
			.order("created_at", { ascending: true });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile elencare i membri",
			});
		}

		return data ?? [];
	}),

	/**
	 * List invitations for the active organization
	 */
	listInvitations: protectedOrganizationProcedure.query(async ({ ctx }) => {
		assertOrgAdmin(ctx.membership.role);

		const { data, error } = await ctx.supabase
			.from("invitation")
			.select("*")
			.eq("organization_id", ctx.organization.id)
			.order("created_at", { ascending: false });

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Impossibile elencare gli inviti",
			});
		}

		return data ?? [];
	}),
});

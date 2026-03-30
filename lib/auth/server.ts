import "server-only";

import { TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getUser = cache(async () => {
	const supabase = await createClient();
	const { data } = await supabase.auth.getClaims();

	if (!data?.claims) return null;

	const claims = data.claims;

	const { data: profile } = await supabase
		.from("user_profile")
		.select("*")
		.eq("id", claims.sub)
		.single();

	return {
		id: claims.sub,
		email: claims.email ?? "",
		phone: claims.phone ?? "",
		aal: claims.aal,
		sessionId: claims.session_id,
		isAnonymous: claims.is_anonymous,
		appMetadata: claims.app_metadata,
		userMetadata: claims.user_metadata,
		profile,
	};
});

/**
 * Compatibility wrapper that returns a session-like object.
 * Matches the shape expected by existing code that used Better Auth's getSession.
 */
export const getSession = cache(async () => {
	const user = await getUser();
	if (!user) return null;

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.userMetadata?.name ?? "",
			image: user.userMetadata?.image ?? null,
			role: user.profile?.role ?? user.appMetadata?.role ?? "user",
			banned: user.profile?.banned ?? false,
			banReason: user.profile?.ban_reason ?? null,
			banExpires: user.profile?.ban_expires ?? null,
			twoFactorEnabled: false,
			onboardingComplete:
				user.profile?.onboarding_complete ??
				user.userMetadata?.onboardingComplete ??
				false,
			emailVerified: !!user.email,
			createdAt: user.profile?.created_at ?? new Date().toISOString(),
			updatedAt: user.profile?.updated_at ?? new Date().toISOString(),
		},
		session: {
			id: user.sessionId ?? "",
			userId: user.id,
			activeOrganizationId:
				(await cookies()).get("active-organization-id")?.value ?? null,
			impersonatedBy: null,
			token: "",
		},
	};
});

export const getOrganizationById = cache(async (orgId: string) => {
	const supabase = await createClient();
	const { data } = await supabase
		.from("organization")
		.select("*, members:member(*)")
		.eq("id", orgId)
		.single();
	return data;
});

export const assertUserIsOrgMember = cache(
	async (orgId: string, userId: string) => {
		const supabase = await createClient();
		const { data: member } = await supabase
			.from("member")
			.select("*, organization:organization(*)")
			.eq("organization_id", orgId)
			.eq("user_id", userId)
			.single();

		if (!member || !member.organization) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Not a member of this organization",
			});
		}

		return {
			organization: member.organization,
			membership: { role: member.role, id: member.id },
		};
	},
);

/**
 * Get active sessions for the current user.
 * Supabase doesn't expose session listing like Better Auth did.
 * Returns the current session as the only active session.
 */
export const getActiveSessions = cache(async () => {
	const user = await getUser();
	if (!user) return [];

	return [
		{
			id: user.sessionId ?? "",
			userId: user.id,
			token: "",
			userAgent: "",
			ipAddress: "",
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		},
	];
});

/**
 * Get linked accounts for the current user.
 * Returns identity providers linked to the Supabase user.
 */
export const getUserAccounts = cache(async () => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user?.identities) return [];

	return user.identities.map((identity) => ({
		id: identity.id,
		providerId: identity.provider,
		accountId: identity.identity_id,
		createdAt: identity.created_at,
		updatedAt: identity.updated_at,
	}));
});

export const getOrganizationList = cache(async () => {
	const user = await getUser();
	if (!user) return [];

	const supabase = await createClient();
	const { data } = await supabase
		.from("member")
		.select("organization:organization(*), role")
		.eq("user_id", user.id);

	return data?.map((m) => ({ ...m.organization, role: m.role })) ?? [];
});

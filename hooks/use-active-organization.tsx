"use client";

import { createContext, useContext } from "react";

export type ActiveOrganizationData = {
	id: string;
	name: string;
	slug?: string | null;
	logo?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	metadata?: string | null;
	stripe_customer_id?: string | null;
	members?: Array<{
		id: string;
		user_id: string;
		role: string;
		organization_id?: string;
		created_at?: string;
		user?: {
			id: string;
			name: string;
			email: string;
			image?: string | null;
		} | null;
	}>;
	invitations?: Array<{
		id: string;
		email: string;
		role: string;
		status: string;
		expires_at: string;
		organization_id?: string;
		inviter_id?: string;
	}>;
	[key: string]: unknown;
} | null;

export const ActiveOrganizationContext =
	createContext<ActiveOrganizationData>(null);

/**
 * Hook to get the active organization from context.
 * Replaces authClient.useActiveOrganization() from Better Auth.
 * The organization is provided by ActiveOrganizationProvider in the layout.
 */
export function useActiveOrganization() {
	const organization = useContext(ActiveOrganizationContext);
	return { data: organization, isPending: false };
}

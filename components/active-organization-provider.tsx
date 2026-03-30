"use client";

import {
	ActiveOrganizationContext,
	type ActiveOrganizationData,
} from "@/hooks/use-active-organization";

/**
 * Provider that makes the active organization available to child components.
 * Replaces Better Auth's session-based active organization.
 * The organization data comes from the server layout (via getOrganizationById).
 */
export function ActiveOrganizationProvider({
	organization,
	children,
}: React.PropsWithChildren<{
	organization: ActiveOrganizationData;
}>): React.JSX.Element {
	return (
		<ActiveOrganizationContext.Provider value={organization}>
			{children}
		</ActiveOrganizationContext.Provider>
	);
}

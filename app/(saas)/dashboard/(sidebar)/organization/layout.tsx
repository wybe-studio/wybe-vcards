import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type * as React from "react";
import { OrganizationMenuItems } from "@/components/organization/organization-menu-items";
import { SidebarLayout } from "@/components/sidebar-layout";
import { featuresConfig } from "@/config/features.config";
import { getOrganizationById, getUser } from "@/lib/auth/server";
import { shouldRedirectToChoosePlan } from "@/lib/billing/guards";
import { OrganizationProviders } from "./providers";

export type OrganizationLayoutProps = React.PropsWithChildren;

/**
 * Organization layout that requires an active organization in the session.
 * If no active organization is set, redirects to /dashboard to select one.
 * If billing requires a plan and none is active, redirects to /dashboard/choose-plan.
 */
export default async function OrganizationLayout({
	children,
}: OrganizationLayoutProps): Promise<React.JSX.Element> {
	const user = await getUser();

	// If no session, the auth middleware will handle redirect
	if (!user) {
		redirect("/auth/sign-in");
	}

	// Get the active organization from cookie (set by /api/organization/switch)
	// Note: this is an unverified client hint — actual authorization happens via RLS
	const cookieStore = await cookies();
	const rawOrgId = cookieStore.get("active-organization-id")?.value;
	const UUID_RE =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const activeOrganizationId =
		rawOrgId && UUID_RE.test(rawOrgId) ? rawOrgId : null;

	if (!activeOrganizationId) {
		redirect("/dashboard");
	}

	// Get the active organization details
	const organization = await getOrganizationById(
		activeOrganizationId as string,
	);
	if (!organization) {
		// Active organization no longer exists, redirect to dashboard
		redirect("/dashboard");
	}

	// Check if user needs to choose a plan before accessing organization
	if (featuresConfig.billing) {
		const needsToChoosePlan = await shouldRedirectToChoosePlan(organization.id);
		if (needsToChoosePlan) {
			redirect("/dashboard/choose-plan");
		}
	}

	return (
		<OrganizationProviders organization={organization}>
			<SidebarLayout
				defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
				defaultWidth={cookieStore.get("sidebar_width")?.value}
				menuItems={<OrganizationMenuItems />}
			>
				{children}
			</SidebarLayout>
		</OrganizationProviders>
	);
}

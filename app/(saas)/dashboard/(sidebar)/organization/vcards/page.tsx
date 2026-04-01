import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MemberVcardEditor } from "@/components/organization/member-vcard-editor";
import { VcardsTable } from "@/components/organization/vcards-table";
import {
	Page,
	PageBody,
	PageBreadcrumb,
	PageContent,
	PageHeader,
	PagePrimaryBar,
} from "@/components/ui/custom/page";
import { getOrganizationById, getSession } from "@/lib/auth/server";

export const metadata: Metadata = {
	title: "vCard",
};

export default async function VcardsPage(): Promise<React.JSX.Element> {
	const session = await getSession();
	if (!session?.session.activeOrganizationId) {
		redirect("/dashboard");
	}

	const organization = await getOrganizationById(
		session.session.activeOrganizationId,
	);
	if (!organization) {
		redirect("/dashboard");
	}

	const isPlatformAdmin = session.user.role === "admin";
	const memberRole = organization.members?.find(
		(m) => m.user_id === session.user.id,
	)?.role;
	const isOrgAdmin =
		isPlatformAdmin || memberRole === "owner" || memberRole === "admin";

	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar actions={<NotificationBell />}>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: organization.name, href: "/dashboard/organization" },
							{ label: isOrgAdmin ? "vCard" : "La mia vCard" },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title={isOrgAdmin ? "vCard" : "La mia vCard"}>
					{isOrgAdmin ? <VcardsTable /> : <MemberVcardEditor />}
				</PageContent>
			</PageBody>
		</Page>
	);
}

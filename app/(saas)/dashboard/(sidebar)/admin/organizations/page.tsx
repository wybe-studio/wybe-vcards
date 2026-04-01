import type { Metadata } from "next";
import type * as React from "react";
import { OrganizationsTable } from "@/components/admin/organizations/organizations-table";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
	Page,
	PageBody,
	PageBreadcrumb,
	PageContent,
	PageHeader,
	PagePrimaryBar,
} from "@/components/ui/custom/page";

export const metadata: Metadata = {
	title: "Organizzazioni",
};

export default function AdminOrganizationsPage(): React.JSX.Element {
	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar actions={<NotificationBell />}>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: "Admin", href: "/dashboard/admin" },
							{ label: "Organizzazioni" },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title="Organizzazioni">
					<OrganizationsTable />
				</PageContent>
			</PageBody>
		</Page>
	);
}

import type { Metadata } from "next";
import type * as React from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OrganizationsGrid } from "@/components/organization/organizations-grid";

export const metadata: Metadata = {
	title: "Home",
};

import {
	Page,
	PageBody,
	PageBreadcrumb,
	PageHeader,
	PagePrimaryBar,
	PageTitle,
} from "@/components/ui/custom/page";

export default function AccountPage(): React.JSX.Element {
	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar actions={<NotificationBell />}>
					<PageBreadcrumb segments={[{ label: "Home" }]} />
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<div className="p-4 pb-24 sm:px-6 sm:pt-6">
					<div className="w-full space-y-4">
						<div>
							<PageTitle>Le tue organizzazioni</PageTitle>
						</div>
						<OrganizationsGrid />
					</div>
				</div>
			</PageBody>
		</Page>
	);
}

import type { Metadata } from "next";
import type * as React from "react";
import { AppConfigTable } from "@/components/admin/app-config/app-config-table";
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
	title: "Configurazione App",
};

export default function AdminAppConfigPage(): React.JSX.Element {
	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar actions={<NotificationBell />}>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: "Admin", href: "/dashboard/admin" },
							{ label: "Configurazione App" },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title="Configurazione App">
					<AppConfigTable />
				</PageContent>
			</PageBody>
		</Page>
	);
}

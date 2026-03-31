import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
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

	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: organization.name, href: "/dashboard/organization" },
							{ label: "vCard" },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title="vCard">
					<VcardsTable />
				</PageContent>
			</PageBody>
		</Page>
	);
}

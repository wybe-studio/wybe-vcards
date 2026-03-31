"use client";

import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { OrgLimitsCard } from "@/components/admin/organizations/org-limits-card";
import { OrgPhysicalCardsTab } from "@/components/admin/organizations/org-physical-cards-tab";
import { OrgVcardsTab } from "@/components/admin/organizations/org-vcards-tab";
import {
	Page,
	PageBody,
	PageBreadcrumb,
	PageContent,
	PageHeader,
	PagePrimaryBar,
} from "@/components/ui/custom/page";
import {
	UnderlinedTabs,
	UnderlinedTabsContent,
	UnderlinedTabsList,
	UnderlinedTabsTrigger,
} from "@/components/ui/custom/underlined-tabs";
import { trpc } from "@/trpc/client";

const tabValues = ["limits", "vcards", "physical-cards"] as const;
type TabValue = (typeof tabValues)[number];

export default function AdminOrganizationDetailPage() {
	const params = useParams<{ organizationId: string }>();
	const organizationId = params.organizationId;

	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(tabValues).withDefault("limits"),
	);

	const { data: org, isPending: orgLoading } =
		trpc.admin.physicalCard.getOrgLimits.useQuery({
			organizationId,
		});

	const { data: vcardsData } = trpc.admin.physicalCard.listOrgVcards.useQuery({
		organizationId,
		limit: 1,
		offset: 0,
	});

	const { data: cardsData } =
		trpc.admin.physicalCard.listOrgPhysicalCards.useQuery({
			organizationId,
			limit: 1,
			offset: 0,
		});

	if (orgLoading) {
		return (
			<Page>
				<PageBody>
					<div className="flex items-center justify-center py-16">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</PageBody>
			</Page>
		);
	}

	const orgName = org?.name ?? "Organizzazione";
	const maxVcards = org?.max_vcards ?? 10;
	const maxPhysicalCards = org?.max_physical_cards ?? 20;

	return (
		<Page>
			<PageHeader>
				<PagePrimaryBar>
					<PageBreadcrumb
						segments={[
							{ label: "Home", href: "/dashboard" },
							{ label: "Admin", href: "/dashboard/admin/organizations" },
							{
								label: "Organizzazioni",
								href: "/dashboard/admin/organizations",
							},
							{ label: orgName },
						]}
					/>
				</PagePrimaryBar>
			</PageHeader>
			<PageBody>
				<PageContent title={orgName}>
					<UnderlinedTabs
						className="w-full"
						value={tab}
						onValueChange={(value) => setTab(value as TabValue)}
					>
						<UnderlinedTabsList className="mb-6 sm:-ml-4">
							<UnderlinedTabsTrigger value="limits">
								Limiti
							</UnderlinedTabsTrigger>
							<UnderlinedTabsTrigger value="vcards">
								vCard ({vcardsData?.total ?? 0}/{maxVcards})
							</UnderlinedTabsTrigger>
							<UnderlinedTabsTrigger value="physical-cards">
								Card fisiche ({cardsData?.total ?? 0}/{maxPhysicalCards})
							</UnderlinedTabsTrigger>
						</UnderlinedTabsList>

						<UnderlinedTabsContent value="limits">
							<OrgLimitsCard
								organizationId={organizationId}
								maxVcards={maxVcards}
								maxPhysicalCards={maxPhysicalCards}
							/>
						</UnderlinedTabsContent>

						<UnderlinedTabsContent value="vcards">
							<OrgVcardsTab organizationId={organizationId} />
						</UnderlinedTabsContent>

						<UnderlinedTabsContent value="physical-cards">
							<OrgPhysicalCardsTab
								organizationId={organizationId}
								maxPhysicalCards={maxPhysicalCards}
							/>
						</UnderlinedTabsContent>
					</UnderlinedTabs>
				</PageContent>
			</PageBody>
		</Page>
	);
}

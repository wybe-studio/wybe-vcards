"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import type * as React from "react";
import { CreditsSettingsTab } from "@/components/billing/credits-settings-tab";
import { SubscriptionSettingsTab } from "@/components/billing/subscription-settings-tab";
import { DeleteOrganizationCard } from "@/components/organization/delete-organization-card";
import { OrganizationChangeNameCard } from "@/components/organization/organization-change-name-card";
import { OrganizationInviteMemberCard } from "@/components/organization/organization-invite-member-card";
import { OrganizationLogoCard } from "@/components/organization/organization-logo-card";
import { OrganizationLogoWideCard } from "@/components/organization/organization-logo-wide-card";
import { OrganizationMembersCard } from "@/components/organization/organization-members-card";
import { OrganizationProfileCard } from "@/components/organization/organization-profile-card";
import { OrganizationStyleCard } from "@/components/organization/organization-style-card";
import {
	UnderlinedTabs,
	UnderlinedTabsContent,
	UnderlinedTabsList,
	UnderlinedTabsTrigger,
} from "@/components/ui/custom/underlined-tabs";
import { billingConfig } from "@/config/billing.config";

const tabValues = [
	"general",
	"profile",
	"style",
	"members",
	"subscription",
	"credits",
] as const;
type TabValue = (typeof tabValues)[number];

type OrganizationSettingsTabsProps = {
	isAdmin: boolean;
};

export function OrganizationSettingsTabs({
	isAdmin,
}: OrganizationSettingsTabsProps): React.JSX.Element {
	const defaultTab = isAdmin ? "general" : "members";
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(tabValues).withDefault(defaultTab),
	);

	return (
		<UnderlinedTabs
			className="w-full"
			value={tab}
			onValueChange={(value) => setTab(value as TabValue)}
		>
			<UnderlinedTabsList className="mb-6 sm:-ml-4">
				{isAdmin && (
					<UnderlinedTabsTrigger value="general">
						Generale
					</UnderlinedTabsTrigger>
				)}
				{isAdmin && (
					<UnderlinedTabsTrigger value="profile">
						Profilo aziendale
					</UnderlinedTabsTrigger>
				)}
				{isAdmin && (
					<UnderlinedTabsTrigger value="style">Stile</UnderlinedTabsTrigger>
				)}
				<UnderlinedTabsTrigger value="members">Membri</UnderlinedTabsTrigger>
				{billingConfig.enabled && (
					<UnderlinedTabsTrigger value="subscription">
						Abbonamento
					</UnderlinedTabsTrigger>
				)}
				{billingConfig.enabled && (
					<UnderlinedTabsTrigger value="credits">Crediti</UnderlinedTabsTrigger>
				)}
			</UnderlinedTabsList>
			{isAdmin && (
				<UnderlinedTabsContent value="general">
					<div className="space-y-4">
						<OrganizationLogoCard />
						<OrganizationChangeNameCard />
						<DeleteOrganizationCard />
					</div>
				</UnderlinedTabsContent>
			)}
			{isAdmin && (
				<UnderlinedTabsContent value="profile">
					<OrganizationProfileCard />
				</UnderlinedTabsContent>
			)}
			{isAdmin && (
				<UnderlinedTabsContent value="style">
					<div className="space-y-4">
						<OrganizationLogoWideCard />
						<OrganizationStyleCard />
					</div>
				</UnderlinedTabsContent>
			)}
			<UnderlinedTabsContent value="members">
				<div className="space-y-4">
					{isAdmin && <OrganizationInviteMemberCard />}
					<OrganizationMembersCard />
				</div>
			</UnderlinedTabsContent>
			{billingConfig.enabled && (
				<UnderlinedTabsContent value="subscription">
					<SubscriptionSettingsTab isAdmin={isAdmin} />
				</UnderlinedTabsContent>
			)}
			{billingConfig.enabled && (
				<UnderlinedTabsContent value="credits">
					<CreditsSettingsTab isAdmin={isAdmin} />
				</UnderlinedTabsContent>
			)}
		</UnderlinedTabs>
	);
}

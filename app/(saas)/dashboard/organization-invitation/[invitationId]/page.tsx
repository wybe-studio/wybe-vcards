import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
import { OrganizationInvitationCard } from "@/components/invitations/organization-invitation-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/custom/theme-toggle";
import { getUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
	title: "Invito organizzazione",
};

export type OrganizationInvitationPageProps = {
	params: Promise<{ invitationId: string }>;
};

export default async function OrganizationInvitationPage({
	params,
}: OrganizationInvitationPageProps): Promise<React.JSX.Element> {
	const { invitationId } = await params;

	const adminClient = createAdminClient();
	const [{ data: invitation }, user] = await Promise.all([
		adminClient
			.from("invitation")
			.select(
				"id, email, status, expires_at, organization:organization_id(name, slug, logo)",
			)
			.eq("id", invitationId)
			.single(),
		getUser(),
	]);

	// Redirect if invitation not found, not pending, or expired
	if (
		!invitation ||
		invitation.status !== "pending" ||
		new Date(invitation.expires_at) < new Date()
	) {
		redirect("/dashboard");
	}

	// Normalize the organization (Supabase may return array or object for FK relations)
	const org =
		invitation.organization && !Array.isArray(invitation.organization)
			? (invitation.organization as {
					name: string;
					slug: string;
					logo: string | null;
				})
			: null;

	// Check if logged-in user's email matches the invitation email
	const isRecipient =
		user?.email?.toLowerCase() === invitation.email.toLowerCase();

	// Show error message if user is not the recipient
	if (!isRecipient) {
		return (
			<>
				<Card className="w-full border-transparent px-4 py-8 dark:border-border">
					<CardHeader>
						<CardTitle className="text-center text-base lg:text-lg">
							Account errato
						</CardTitle>
						<CardDescription className="text-center">
							Questo invito è stato inviato a{" "}
							<span className="font-medium">{invitation.email}</span>. Accedi
							con quell'indirizzo email per accettare l'invito.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<p className="text-muted-foreground text-center text-sm">
							Hai effettuato l'accesso come{" "}
							<span className="font-medium">{user?.email}</span>.
						</p>
					</CardContent>
				</Card>
				<ThemeToggle className="fixed right-2 bottom-2 rounded-full" />
			</>
		);
	}

	return (
		<>
			<OrganizationInvitationCard
				invitationId={invitationId}
				logoUrl={org?.logo || undefined}
				organizationName={org?.name ?? ""}
				organizationSlug={org?.slug ?? ""}
			/>
			<ThemeToggle className="fixed right-2 bottom-2 rounded-full" />
		</>
	);
}

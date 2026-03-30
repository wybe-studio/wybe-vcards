import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
import { withQuery } from "ufo";
import { SignUpCard } from "@/components/auth/sign-up-card";
import { authConfig } from "@/config/auth.config";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
	title: "Crea un account",
};

export type SignupPageProps = {
	searchParams: Promise<{
		[key: string]: string | string[] | undefined;
		invitationId?: string;
	}>;
};

export default async function SignupPage({
	searchParams,
}: SignupPageProps): Promise<React.JSX.Element> {
	const params = await searchParams;
	const { invitationId } = params;

	// Redirect to sign-in if signup is disabled and no invitation
	if (!(authConfig.enableSignup || invitationId)) {
		return redirect(withQuery("/auth/sign-in", params));
	}

	if (invitationId) {
		const adminClient = createAdminClient();
		const { data: invitation } = await adminClient
			.from("invitation")
			.select("email, status, expires_at, organization:organization_id(name)")
			.eq("id", invitationId)
			.single();

		if (
			!invitation ||
			invitation.status !== "pending" ||
			new Date(invitation.expires_at).getTime() < Date.now()
		) {
			return redirect(withQuery("/auth/sign-in", params));
		}

		const orgName =
			invitation.organization && !Array.isArray(invitation.organization)
				? (invitation.organization as { name: string }).name
				: undefined;

		return (
			<SignUpCard prefillEmail={invitation.email} organizationName={orgName} />
		);
	}

	return <SignUpCard />;
}

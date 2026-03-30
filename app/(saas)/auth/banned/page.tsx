import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type * as React from "react";
import { BannedCard } from "@/components/auth/banned-card";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = {
	title: "Account sospeso",
};

export default async function BannedPage(): Promise<React.JSX.Element> {
	const user = await getUser();

	if (!user) {
		redirect("/auth/sign-in");
	}

	// Check if user is banned via profile or metadata
	const isBanned = user.profile?.banned ?? user.userMetadata?.banned ?? false;
	const banReason =
		user.profile?.ban_reason ?? user.userMetadata?.ban_reason ?? null;
	const banExpires =
		user.profile?.ban_expires ?? user.userMetadata?.ban_expires ?? null;

	if (!isBanned) {
		redirect("/dashboard");
	}

	return (
		<BannedCard
			banReason={banReason}
			banExpires={banExpires ? new Date(banExpires) : null}
		/>
	);
}

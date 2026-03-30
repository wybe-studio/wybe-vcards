"use client";

import type * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OAuthProvider } from "@/lib/auth/oauth-providers";
import { oAuthProviders } from "@/lib/auth/oauth-providers";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";

export function ConnectedAccountsCard(): React.JSX.Element {
	const { data, isPending } = trpc.user.getAccounts.useQuery();

	const isProviderLinked = (provider: OAuthProvider) =>
		data?.some((account) => account.providerId === provider);

	const connect = (provider: OAuthProvider) => {
		if (!isProviderLinked(provider)) {
			const supabase = createClient();
			supabase.auth.linkIdentity({
				provider,
				options: {
					redirectTo: window.location.href,
				},
			});
		}
	};

	const disconnect = (provider: OAuthProvider) => {
		if (isProviderLinked(provider)) {
			const supabase = createClient();
			// Supabase uses unlinkIdentity with the identity object
			// This requires fetching the identity first
			supabase.auth.getUserIdentities().then(({ data }) => {
				const identity = data?.identities?.find((i) => i.provider === provider);
				if (identity) {
					supabase.auth.unlinkIdentity(identity);
				}
			});
		}
	};

	const isLastAccount = (data?.length || 0) === 1;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Account collegati</CardTitle>
				<CardDescription>
					Accedi più velocemente al tuo account collegandolo a Google.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-3">
					{Object.entries(oAuthProviders).map(([provider, providerData]) => {
						const isLinked = isProviderLinked(provider as OAuthProvider);
						return (
							<div
								key={provider}
								className="flex items-center justify-between gap-3 rounded-lg border p-4"
							>
								<div className="flex items-center gap-3">
									<providerData.icon className="size-5 text-primary/50" />
									<span className="font-medium text-sm">
										{providerData.name}
									</span>
								</div>
								{isPending ? (
									<Skeleton className="h-10 w-28" />
								) : (
									<Button
										variant="outline"
										disabled={isLinked && isLastAccount}
										onClick={() =>
											isLinked
												? disconnect(provider as OAuthProvider)
												: connect(provider as OAuthProvider)
										}
									>
										{isLinked ? "Scollega" : "Collega"}
									</Button>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

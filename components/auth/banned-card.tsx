"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authConfig } from "@/config/auth.config";
import { createClient } from "@/lib/supabase/client";

type BannedCardProps = {
	banReason?: string | null;
	banExpires?: Date | null;
};

export function BannedCard({
	banReason,
	banExpires,
}: BannedCardProps): React.JSX.Element {
	const router = useRouter();
	const queryClient = useQueryClient();

	const handleSignOut = async () => {
		try {
			const supabase = createClient();
			await supabase.auth.signOut();
		} finally {
			// Clear the query cache to prevent any user data from persisting
			queryClient.clear();

			// Preserve device-level preferences
			const theme = localStorage.getItem("theme");
			const cookieConsent = localStorage.getItem("cookie_consent");

			localStorage.clear();
			sessionStorage.clear();

			// Restore device-level preferences
			if (theme) localStorage.setItem("theme", theme);
			if (cookieConsent) localStorage.setItem("cookie_consent", cookieConsent);

			router.refresh();
			window.location.href = new URL(
				authConfig.redirectAfterLogout,
				window.location.origin,
			).toString();
		}
	};

	return (
		<Card className="w-full border-transparent px-4 py-8 dark:border-border">
			<CardHeader>
				<CardTitle className="text-base lg:text-lg">Account sospeso</CardTitle>
				<CardDescription>
					Il tuo account è stato temporaneamente sospeso.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<Alert variant="destructive">
					<AlertCircleIcon className="h-4 w-4" />
					<AlertDescription>
						Non puoi accedere al Dashboard mentre il tuo account è sospeso.
					</AlertDescription>
				</Alert>

				<div className="space-y-4">
					<div>
						<p className="font-medium text-sm text-marketing-fg-muted">
							Motivo della sospensione:
						</p>
						<p className="text-sm text-marketing-fg">
							{banReason || "Nessun motivo specificato"}
						</p>
					</div>

					{banExpires && (
						<div>
							<p className="font-medium text-sm text-marketing-fg-muted">
								Scadenza della sospensione:
							</p>
							<p className="text-sm text-marketing-fg">
								{new Date(banExpires).toLocaleDateString("it-IT", {
									year: "numeric",
									month: "long",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</div>
					)}
				</div>

				<div className="space-y-3">
					<p className="text-sm text-marketing-fg-muted">
						Se ritieni che si tratti di un errore, contatta il supporto.
					</p>
					<Button
						variant="outline"
						className="w-full"
						onClick={handleSignOut}
						type="button"
					>
						Esci
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

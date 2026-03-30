"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ShieldCheck, ShieldCheckIcon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TwoFactorModal } from "@/components/user/two-factor-modal";
import { useSession } from "@/hooks/use-session";
import { trpc } from "@/trpc/client";

export type TwoFactorCardProps = {
	hasCredentialAccount?: boolean;
};

export function TwoFactorCard({
	hasCredentialAccount,
}: TwoFactorCardProps): React.JSX.Element | null {
	const { user } = useSession();

	const { data: accounts, isLoading } = trpc.user.getAccounts.useQuery(
		undefined,
		{
			enabled: hasCredentialAccount === undefined,
		},
	);

	const isCredentialAccount =
		hasCredentialAccount ??
		accounts?.some((account) => account.providerId === "credential");

	if (isCredentialAccount === false) {
		return null;
	}

	if (isCredentialAccount === undefined && isLoading) {
		return <Skeleton className="h-[218px] w-full" />;
	}

	const handleShowTwoFactorModal = () => {
		NiceModal.show(TwoFactorModal);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Autenticazione a due fattori</CardTitle>
				<CardDescription>
					Configura l'autenticazione a due fattori per proteggere ulteriormente
					il tuo account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{user?.twoFactorEnabled ? (
					<div className="flex flex-col items-start gap-4">
						<Alert variant="success">
							<ShieldCheckIcon className="size-4 shrink-0 text-green-500" />
							<AlertDescription>
								L'autenticazione a due fattori è attiva per il tuo account.
							</AlertDescription>
						</Alert>
						<Button
							type="button"
							variant="default"
							onClick={handleShowTwoFactorModal}
						>
							Disattiva autenticazione a due fattori
						</Button>
					</div>
				) : (
					<div className="flex flex-col items-start gap-4">
						<Alert>
							<ShieldCheck className="size-4 shrink-0" />
							<AlertDescription>
								Proteggi il tuo account con un livello di sicurezza aggiuntivo.
							</AlertDescription>
						</Alert>
						<div className="flex justify-start">
							<Button
								type="button"
								variant="default"
								onClick={handleShowTwoFactorModal}
							>
								Configura un nuovo fattore
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

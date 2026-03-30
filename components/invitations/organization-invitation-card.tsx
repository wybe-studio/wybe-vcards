"use client";

import { CheckIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { OrganizationLogo } from "@/components/organization/organization-logo";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useProgressRouter } from "@/hooks/use-progress-router";
import { trpc } from "@/trpc/client";

export type OrganizationInvitationModalProps = {
	invitationId: string;
	organizationName: string;
	organizationSlug: string;
	logoUrl?: string;
};

export function OrganizationInvitationCard({
	invitationId,
	organizationName,
	organizationSlug,
	logoUrl,
}: OrganizationInvitationModalProps): React.JSX.Element {
	const router = useProgressRouter();
	const utils = trpc.useUtils();
	const [submitting, setSubmitting] = React.useState<
		false | "accept" | "reject"
	>(false);

	const acceptInvitation =
		trpc.organization.management.acceptInvitation.useMutation({
			onSuccess: () => {
				utils.organization.list.invalidate();
				router.replace("/dashboard");
			},
			onError: (err) => {
				toast.error(err.message ?? "Si è verificato un errore. Riprova.");
				setSubmitting(false);
			},
		});

	const rejectInvitation =
		trpc.organization.management.rejectInvitation.useMutation({
			onSuccess: () => {
				utils.organization.list.invalidate();
				router.replace("/dashboard");
			},
			onError: (err) => {
				toast.error(err.message ?? "Si è verificato un errore. Riprova.");
				setSubmitting(false);
			},
		});

	const onSelectAnswer = (accept: boolean) => {
		setSubmitting(accept ? "accept" : "reject");
		if (accept) {
			acceptInvitation.mutate({ invitationId });
		} else {
			rejectInvitation.mutate({ invitationId });
		}
	};

	return (
		<Card className="w-full border-transparent px-4 py-8 dark:border-border">
			<CardHeader>
				<CardTitle className="text-center text-base lg:text-lg">
					Sei stato invitato
				</CardTitle>
				<CardDescription className="text-center">
					{organizationName} ti ha invitato a unirti alla loro organizzazione.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				{/* Organization Info */}
				<div className="flex items-center gap-3 rounded-lg border p-3">
					<OrganizationLogo
						className="size-10"
						name={organizationName}
						src={logoUrl}
					/>
					<div>
						<p className="font-semibold text-sm">{organizationName}</p>
						<p className="text-muted-foreground text-xs">Organizzazione</p>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						disabled={!!submitting}
						onClick={() => onSelectAnswer(false)}
					>
						{submitting === "reject" ? (
							<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						) : (
							<XIcon className="size-4" />
						)}
						Rifiuta
					</Button>
					<Button
						className="flex-1"
						disabled={!!submitting}
						onClick={() => onSelectAnswer(true)}
					>
						{submitting === "accept" ? (
							<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
						) : (
							<CheckIcon className="size-4" />
						)}
						Accetta
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

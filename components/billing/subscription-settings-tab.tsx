"use client";

import NiceModal from "@ebay/nice-modal-react";
import { format } from "date-fns";
import {
	AlertCircle,
	Check,
	ExternalLink,
	FileText,
	RefreshCw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PricingTable } from "@/components/billing/pricing-table";
import { SubscriptionStatusBadge } from "@/components/billing/subscription-status-badge";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/billing/utils";
import { trpc } from "@/trpc/client";

interface SubscriptionSettingsTabProps {
	/** Whether the current user is an admin/owner of the organization */
	isAdmin: boolean;
}

export function SubscriptionSettingsTab({
	isAdmin,
}: SubscriptionSettingsTabProps) {
	const searchParams = useSearchParams();
	const hasShownFeedback = useRef(false);

	const utils = trpc.useUtils();

	// Handle checkout success/cancel URL params and show feedback
	useEffect(() => {
		if (hasShownFeedback.current) return;

		const success = searchParams.get("success");
		const canceled = searchParams.get("canceled");

		if (success === "true") {
			hasShownFeedback.current = true;
			toast.success("Abbonamento attivato con successo!", {
				description: "La tua fatturazione e stata aggiornata.",
			});

			// Refresh billing data
			utils.organization.subscription.getStatus.invalidate();
			utils.organization.subscription.listInvoices.invalidate();

			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete("success");
			window.history.replaceState({}, "", url.toString());
		}

		if (canceled === "true") {
			hasShownFeedback.current = true;
			toast.info("Checkout annullato", {
				description: "Nessuna modifica al tuo abbonamento.",
			});

			// Clean up URL
			const url = new URL(window.location.href);
			url.searchParams.delete("canceled");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams, utils]);

	const {
		data: billingStatus,
		isLoading: statusLoading,
		isError: statusError,
	} = trpc.organization.subscription.getStatus.useQuery();
	const { data: invoices, isLoading: invoicesLoading } =
		trpc.organization.subscription.listInvoices.useQuery({ limit: 5 });

	const createPortalSession =
		trpc.organization.subscription.createPortalSession.useMutation({
			onSuccess: (data) => {
				window.location.href = data.url;
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

	const cancelSubscription =
		trpc.organization.subscription.cancelSubscription.useMutation({
			onSuccess: () => {
				toast.success(
					"L'abbonamento verra cancellato alla fine del periodo di fatturazione",
				);
				utils.organization.subscription.getStatus.invalidate();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

	const reactivateSubscription =
		trpc.organization.subscription.reactivateSubscription.useMutation({
			onSuccess: () => {
				toast.success("Abbonamento riattivato");
				utils.organization.subscription.getStatus.invalidate();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		});

	const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

	const {
		data: plansData,
		isLoading: plansLoading,
		isError: plansError,
	} = trpc.organization.subscription.listPlans.useQuery();

	const createCheckout =
		trpc.organization.subscription.createCheckout.useMutation({
			onSuccess: (data) => {
				setLoadingPriceId(null);
				window.location.href = data.url;
			},
			onError: (error) => {
				toast.error(error.message);
				setLoadingPriceId(null);
			},
		});

	const handleSelectPlan = (priceId: string) => {
		setLoadingPriceId(priceId);
		createCheckout.mutate({ priceId });
	};

	if (statusLoading || plansLoading) {
		return <SubscriptionSettingsTabSkeleton />;
	}

	if (statusError || plansError) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>
					Impossibile caricare le informazioni di fatturazione
				</AlertTitle>
				<AlertDescription>
					Prova ad aggiornare la pagina. Se il problema persiste, contatta
					l'assistenza.
				</AlertDescription>
			</Alert>
		);
	}

	if (!billingStatus?.enabled) {
		const isNotConfigured = billingStatus?.disabledReason === "not_configured";

		return (
			<Alert variant={isNotConfigured ? "destructive" : "default"}>
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>
					{isNotConfigured
						? "Stripe non configurato"
						: "Fatturazione non abilitata"}
				</AlertTitle>
				<AlertDescription>
					{isNotConfigured
						? "Le chiavi API di Stripe non sono configurate. Aggiungi STRIPE_SECRET_KEY alle variabili d'ambiente."
						: "La fatturazione non e abilitata per questa applicazione. Contatta l'assistenza per maggiori informazioni."}
				</AlertDescription>
			</Alert>
		);
	}

	const { activePlan, subscription } = billingStatus;
	const plans = plansData?.plans ?? [];

	const isFreePlan = activePlan?.planId === "free";
	const isCanceling = subscription?.cancelAtPeriodEnd;

	return (
		<div className="space-y-6">
			{/* Current Plan Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Piano attuale</CardTitle>
							<CardDescription>
								Il tuo abbonamento attuale e le informazioni di fatturazione
							</CardDescription>
						</div>
						{subscription && (
							<SubscriptionStatusBadge status={subscription.status} />
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Plan Info */}
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-lg">
									{activePlan?.planName}
								</h3>
								{activePlan?.isLifetime && (
									<span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
										A vita
									</span>
								)}
							</div>
							{isFreePlan && (
								<p className="text-muted-foreground text-sm">
									Fai l'Upgrade per sbloccare altre funzionalità
								</p>
							)}
							{activePlan?.isTrialing && subscription?.trialEnd && (
								<p className="text-muted-foreground text-sm">
									La prova termina il{" "}
									{format(new Date(subscription.trialEnd), "PPP")}
								</p>
							)}
							{!isFreePlan &&
								!activePlan?.isLifetime &&
								subscription?.currentPeriodEnd && (
									<p className="text-muted-foreground text-sm">
										{isCanceling ? "Accesso fino al" : "Rinnovo il"}{" "}
										{format(new Date(subscription.currentPeriodEnd), "PPP")}
									</p>
								)}
						</div>
						{!isFreePlan && !activePlan?.isLifetime && isAdmin && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => createPortalSession.mutate({})}
								loading={createPortalSession.isPending}
							>
								Gestisci fatturazione
							</Button>
						)}
					</div>

					{/* Cancellation Warning */}
					{isCanceling && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription className="flex items-center justify-between">
								<span>
									Il tuo abbonamento e impostato per la cancellazione il{" "}
									{subscription?.currentPeriodEnd &&
										format(new Date(subscription.currentPeriodEnd), "PPP")}
									.
								</span>
								{isAdmin && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => reactivateSubscription.mutate()}
										loading={reactivateSubscription.isPending}
									>
										<RefreshCw className="mr-1 h-4 w-4" />
										Riattiva
									</Button>
								)}
							</AlertDescription>
						</Alert>
					)}

					{/* Features */}
					{activePlan?.features && activePlan.features.length > 0 && (
						<div>
							<h4 className="mb-2 font-medium text-sm">Funzionalita incluse</h4>
							<ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
								{activePlan.features.map((feature) => (
									<li key={feature} className="flex items-center gap-2 text-sm">
										<Check className="h-4 w-4 shrink-0" />
										{feature}
									</li>
								))}
							</ul>
						</div>
					)}
				</CardContent>
				{isAdmin && !isFreePlan && !activePlan?.isLifetime && !isCanceling && (
					<CardFooter className="border-t pt-6">
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								NiceModal.show(ConfirmationModal, {
									title: "Cancella abbonamento",
									message:
										"Sei sicuro di voler cancellare il tuo abbonamento? Perderai l'accesso alle funzionalità premium alla fine del periodo di fatturazione corrente.",
									confirmLabel: "Cancella abbonamento",
									destructive: true,
									onConfirm: () => {
										cancelSubscription.mutate();
									},
								});
							}}
							loading={cancelSubscription.isPending}
						>
							Cancella abbonamento
						</Button>
					</CardFooter>
				)}
			</Card>

			{/* Upgrade Plan Section - Only for Free Plans */}
			{isFreePlan && (
				<div className="space-y-4">
					<div>
						<h3 className="font-semibold text-lg">
							Fai l'Upgrade del tuo piano
						</h3>
						<p className="text-muted-foreground text-sm">
							Scegli il piano più adatto alle tue esigenze
						</p>
					</div>

					<PricingTable
						plans={plans}
						currentPlanId={activePlan?.planId}
						onSelectPlan={handleSelectPlan}
						loadingPriceId={loadingPriceId}
						showFreePlans={false}
						showEnterprisePlans={true}
						className="w-full"
					/>
				</div>
			)}

			{/* Invoices */}
			{!isFreePlan && (
				<Card>
					<CardHeader>
						<CardTitle>Fatture recenti</CardTitle>
						<CardDescription>
							Visualizza e scarica le tue fatture
						</CardDescription>
					</CardHeader>
					<CardContent>
						{invoicesLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : invoices && invoices.length > 0 ? (
							<div className="space-y-2">
								{invoices.map((invoice: any) => (
									<div
										key={invoice.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="flex items-center gap-3">
											<FileText className="h-4 w-4 text-muted-foreground" />
											<div>
												<p className="font-medium text-sm">
													{invoice.number ?? invoice.id}
												</p>
												<p className="text-muted-foreground text-xs">
													{format(new Date(invoice.createdAt), "PPP")}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3">
											<span className="font-medium text-sm">
												{formatCurrency(invoice.amount, invoice.currency)}
											</span>
											{invoice.hostedInvoiceUrl && (
												<Button variant="ghost" size="sm" asChild>
													<a
														href={invoice.hostedInvoiceUrl}
														target="_blank"
														rel="noopener noreferrer"
														aria-label={`View invoice ${invoice.number ?? invoice.id}`}
													>
														<ExternalLink className="h-4 w-4" />
													</a>
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">Nessuna fattura</p>
						)}
					</CardContent>
					{isAdmin && billingStatus.hasStripeCustomer && (
						<CardFooter className="border-t pt-6">
							<Button
								variant="outline"
								onClick={() => createPortalSession.mutate({})}
								loading={createPortalSession.isPending}
							>
								Visualizza tutte le fatture
							</Button>
						</CardFooter>
					)}
				</Card>
			)}
		</div>
	);
}

function SubscriptionSettingsTabSkeleton() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-6 w-24" />
								<Skeleton className="h-4 w-36" />
							</div>
							<Skeleton className="h-9 w-28" />
						</div>
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import * as React from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputPassword } from "@/components/ui/custom/input-password";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";

export type TwoFactorModalProps = NiceModalHocProps;

export const TwoFactorModal = NiceModal.create<TwoFactorModalProps>(() => {
	const modal = useEnhancedModal();
	const { user, reloadSession } = useSession();

	const [view, setDialogView] = React.useState<"password" | "totp-url">(
		"password",
	);
	const [totpURI, setTotpURI] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [totpCode, setTotpCode] = React.useState("");

	const totpURISecret = React.useMemo(() => {
		if (!totpURI) {
			return null;
		}

		const url = new URL(totpURI);
		return url.searchParams.get("secret") || null;
	}, [totpURI]);

	const enableTwoFactorMutation = useMutation({
		mutationKey: ["enableTwoFactor"],
		mutationFn: async () => {
			const supabase = createClient();

			// First verify the password by attempting to re-authenticate
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user?.email) {
				throw new Error("No email found for user");
			}

			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: userData.user.email,
				password,
			});

			if (signInError) {
				throw signInError;
			}

			// Enroll a new TOTP factor
			const { data, error } = await supabase.auth.mfa.enroll({
				factorType: "totp",
			});

			if (error) {
				throw error;
			}

			setTotpURI(data.totp.uri);
			setDialogView("totp-url");
		},

		onError: () => {
			toast.error(
				"Impossibile verificare il tuo account con la password fornita. Riprova.",
			);
		},
	});

	const disableTwoFactorMutation = useMutation({
		mutationKey: ["disableTwoFactor"],
		mutationFn: async () => {
			const supabase = createClient();

			// Verify password first
			const { data: userData } = await supabase.auth.getUser();
			if (!userData.user?.email) {
				throw new Error("No email found for user");
			}

			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: userData.user.email,
				password,
			});

			if (signInError) {
				throw signInError;
			}

			// Get factors and unenroll
			const { data: factorsData } = await supabase.auth.mfa.listFactors();
			const totpFactor = factorsData?.totp?.[0];

			if (totpFactor) {
				const { error } = await supabase.auth.mfa.unenroll({
					factorId: totpFactor.id,
				});
				if (error) {
					throw error;
				}
			}

			modal.handleClose();

			toast.success(
				"L'autenticazione a due fattori è stata disattivata con successo.",
			);

			reloadSession();
		},

		onError: () => {
			toast.error(
				"Impossibile verificare il tuo account con la password fornita. Riprova.",
			);
		},
	});

	const verifyTwoFactorMutation = useMutation({
		mutationKey: ["verifyTwoFactor"],
		mutationFn: async () => {
			const supabase = createClient();

			// Get the enrolled TOTP factor
			const { data: factorsData } = await supabase.auth.mfa.listFactors();
			const totpFactor = factorsData?.totp?.[0];

			if (!totpFactor) {
				throw new Error("No TOTP factor found");
			}

			// Create a challenge and verify
			const { data: challengeData, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
			if (challengeError) {
				throw challengeError;
			}

			const { error } = await supabase.auth.mfa.verify({
				factorId: totpFactor.id,
				challengeId: challengeData.id,
				code: totpCode,
			});

			if (error) {
				throw error;
			}

			toast.success(
				"L'autenticazione a due fattori è stata attivata con successo.",
			);

			reloadSession();
			modal.handleClose();
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (user?.twoFactorEnabled) {
			disableTwoFactorMutation.mutate();
			return;
		}

		if (view === "password") {
			enableTwoFactorMutation.mutate();
			return;
		}

		verifyTwoFactorMutation.mutate();
	};
	return (
		<Dialog open={modal.visible}>
			<DialogContent
				className="max-w-md"
				onAnimationEndCapture={modal.handleAnimationEndCapture}
				onClose={modal.handleClose}
			>
				<DialogHeader>
					<DialogTitle>
						{view === "password"
							? "Verifica con password"
							: "Attiva autenticazione a due fattori"}
					</DialogTitle>
					<DialogDescription>
						{view === "password"
							? "Verifica il tuo account inserendo la password."
							: "Usa la tua app di autenticazione preferita e scansiona il codice QR oppure inserisci manualmente il codice segreto qui sotto per configurare l'autenticazione a due fattori."}
					</DialogDescription>
				</DialogHeader>
				{view === "password" ? (
					<form onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 gap-4">
							<FormItem>
								<Label className="block">La tua password:</Label>
								<InputPassword
									autoComplete="current-password"
									onChange={(e) => setPassword(e.target.value)}
									value={password}
								/>
							</FormItem>
						</div>
						<DialogFooter className="mt-4">
							<Button
								className="w-full"
								loading={
									enableTwoFactorMutation.isPending ||
									disableTwoFactorMutation.isPending
								}
								type="submit"
								variant="secondary"
							>
								Continua
								<ArrowRightIcon className="ml-1.5 size-4" />
							</Button>
						</DialogFooter>
					</form>
				) : (
					<form onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 gap-4">
							<div className="flex flex-col items-center gap-4 px-6">
								<QRCode value={totpURI} />
								{totpURISecret && (
									<p className="text-center text-[10px] text-muted-foreground">
										{totpURISecret}
									</p>
								)}
							</div>
							<div className="grid grid-cols-1 gap-4">
								<FormItem>
									<Label className="block">
										Inserisci il codice a 6 cifre per verificare la
										configurazione:
									</Label>
									<Input
										autoComplete="one-time-code"
										onChange={(e) => setTotpCode(e.target.value)}
										value={totpCode}
									/>
								</FormItem>
							</div>
						</div>
						<DialogFooter className="mt-4">
							<Button
								loading={verifyTwoFactorMutation.isPending}
								onClick={modal.handleClose}
								type="button"
								variant="outline"
							>
								Annulla
							</Button>
							<Button
								loading={verifyTwoFactorMutation.isPending}
								type="submit"
								variant="default"
							>
								Salva
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
});

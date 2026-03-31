"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { InputPassword } from "@/components/ui/custom/input-password";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";

type View = "password" | "totp-setup";

export function Setup2faCard(): React.JSX.Element {
	const router = useRouter();
	const { user } = useSession();
	const [view, setView] = React.useState<View>("password");
	const [password, setPassword] = React.useState("");
	const [totpURI, setTotpURI] = React.useState("");
	const [totpFactorId, setTotpFactorId] = React.useState("");
	const [totpCode, setTotpCode] = React.useState("");
	const [error, setError] = React.useState("");
	const [loading, setLoading] = React.useState(false);

	const totpSecret = React.useMemo(() => {
		if (!totpURI) return "";
		try {
			return new URL(totpURI).searchParams.get("secret") ?? "";
		} catch {
			return "";
		}
	}, [totpURI]);

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const supabase = createClient();

			// Verify password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user?.email ?? "",
				password,
			});

			if (signInError) {
				setError("Password non corretta");
				return;
			}

			// Enroll TOTP
			const { data, error: enrollError } = await supabase.auth.mfa.enroll({
				factorType: "totp",
			});

			if (enrollError || !data) {
				setError("Impossibile configurare il 2FA. Riprova.");
				return;
			}

			setTotpURI(data.totp.uri);
			setTotpFactorId(data.id);
			setView("totp-setup");
		} finally {
			setLoading(false);
		}
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const supabase = createClient();

			if (!totpFactorId) {
				setError("Fattore TOTP non trovato. Riprova.");
				return;
			}

			const { data: challenge, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId: totpFactorId });

			if (challengeError || !challenge) {
				setError("Errore nella verifica. Riprova.");
				return;
			}

			const { error: verifyError } = await supabase.auth.mfa.verify({
				factorId: totpFactorId,
				challengeId: challenge.id,
				code: totpCode,
			});

			if (verifyError) {
				setError("Codice non valido. Riprova.");
				return;
			}

			// Refresh session to get AAL2
			await supabase.auth.refreshSession();
			toast.success("Autenticazione a due fattori configurata");
			router.push("/dashboard/admin");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle>Configura autenticazione a due fattori</CardTitle>
				<CardDescription>
					Per accedere al pannello di amministrazione, e necessario configurare
					l'autenticazione a due fattori.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{view === "password" && (
					<form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
						<Field>
							<Label>Conferma la tua password</Label>
							<InputPassword
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setPassword(e.target.value)
								}
								value={password}
							/>
						</Field>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<Button loading={loading} type="submit">
							Continua
						</Button>
					</form>
				)}

				{view === "totp-setup" && (
					<form className="flex flex-col gap-4" onSubmit={handleVerify}>
						<div className="flex justify-center rounded-lg bg-white p-4">
							<QRCode size={200} value={totpURI} />
						</div>
						<p className="text-center text-muted-foreground text-xs">
							Scansiona il QR code con la tua app di autenticazione (Google
							Authenticator, Authy, ecc.)
						</p>
						{totpSecret && (
							<p className="text-center font-mono text-muted-foreground text-xs">
								Chiave manuale: {totpSecret}
							</p>
						)}
						<Field>
							<Label>Codice di verifica</Label>
							<Input
								autoComplete="one-time-code"
								maxLength={6}
								onChange={(e) => setTotpCode(e.target.value)}
								placeholder="000000"
								value={totpCode}
							/>
						</Field>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<Button loading={loading} type="submit">
							Verifica e attiva
						</Button>
					</form>
				)}
			</CardContent>
		</Card>
	);
}

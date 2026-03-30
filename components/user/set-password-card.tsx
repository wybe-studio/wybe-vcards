"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordCard(): React.JSX.Element {
	const { user } = useSession();
	const [submitting, setSubmitting] = React.useState(false);

	const onSubmit = async () => {
		if (!user) {
			return;
		}

		setSubmitting(true);

		try {
			const supabase = createClient();
			const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});

			if (error) {
				throw error;
			}

			toast.success(
				"Controlla la tua casella email per il link per impostare la password.",
			);
		} catch (_err) {
			toast.error(
				"Impossibile inviare il link per impostare la password. Riprova.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>La tua Password</CardTitle>
				<CardDescription>
					Non hai ancora impostato una password. Per farlo, devi seguire la
					procedura di reimpostazione password. Clicca il pulsante qui sotto per
					ricevere un'email con le istruzioni.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div>
					<Button loading={submitting} onClick={onSubmit} type="button">
						Imposta password
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

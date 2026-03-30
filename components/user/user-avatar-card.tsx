"use client";

import type * as React from "react";
import { toast } from "sonner";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { UserAvatarUpload } from "@/components/user/user-avatar-upload";

export function UserAvatarCard(): React.JSX.Element {
	return (
		<Card>
			<CardHeader>
				<CardTitle>La tua foto profilo</CardTitle>
				<CardDescription>
					Scegli una foto da caricare come immagine del profilo.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<UserAvatarUpload
					onError={() => {
						toast.error("Impossibile aggiornare l'avatar");
					}}
					onSuccess={() => {
						toast.success("Avatar aggiornato con successo");
					}}
				/>
			</CardContent>
		</Card>
	);
}

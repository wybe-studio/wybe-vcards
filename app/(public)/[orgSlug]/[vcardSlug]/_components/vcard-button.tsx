"use client";

import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VcardPublicData } from "./types";
import { downloadVCard } from "./vcard-utils";

interface VcardButtonProps {
	data: VcardPublicData;
}

export function VcardButton({ data }: VcardButtonProps) {
	const { theme } = data;

	return (
		<Button
			size="lg"
			style={{
				backgroundColor: theme.button.bgColor,
				color: theme.button.textColor,
			}}
			onClick={() => downloadVCard(data)}
		>
			<UserRoundPlus />
			Aggiungi contatto
		</Button>
	);
}

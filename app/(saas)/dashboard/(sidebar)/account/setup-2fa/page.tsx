import type { Metadata } from "next";
import type * as React from "react";
import { Setup2faCard } from "@/components/admin/setup-2fa-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Configura autenticazione a due fattori",
};

export default function Setup2faPage(): React.JSX.Element {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<Setup2faCard />
		</div>
	);
}

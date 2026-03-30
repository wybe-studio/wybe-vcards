import type { Metadata } from "next";
import { ChangelogSection } from "@/components/marketing/sections/changelog-section";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
	title: "Novità",
	description: `Scopri le novità di ${appConfig.appName}. Ultimi aggiornamenti, funzionalità e miglioramenti.`,
};

export default function ChangelogPage() {
	return <ChangelogSection />;
}

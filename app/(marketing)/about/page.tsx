import type { Metadata } from "next";
import { AboutSection } from "@/components/marketing/sections/about-section";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
	title: "Chi siamo",
	description: `Scopri di più su ${appConfig.appName} e la nostra missione per aiutare le aziende a crescere.`,
};

export default function AboutPage() {
	return <AboutSection />;
}

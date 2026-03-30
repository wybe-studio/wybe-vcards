import type { Metadata } from "next";
import {
	CareersBenefitsSection,
	CareersPositionsSection,
} from "@/components/marketing/sections/careers-section";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
	title: "Lavora con noi",
	description: `Unisciti al team di ${appConfig.appName}. Esplora le posizioni aperte e aiutaci a costruire il futuro del SaaS.`,
};

export default function CareersPage() {
	return (
		<>
			<CareersBenefitsSection />
			<CareersPositionsSection />
		</>
	);
}

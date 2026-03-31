"use client";

import {
	CreditCardIcon,
	LayoutDashboardIcon,
	NfcIcon,
	PaletteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}

function FeatureCard({ feature }: { feature: Feature }) {
	const Icon = feature.icon;
	return (
		<div className="flex flex-col gap-4 rounded-lg bg-marketing-card p-6 sm:p-8">
			<div className="flex size-10 items-center justify-center rounded-lg bg-marketing-card-hover">
				<Icon className="size-5 text-marketing-fg" />
			</div>
			<div>
				<h3 className="text-base font-medium leading-8 text-marketing-fg">
					{feature.title}
				</h3>
				<div className="mt-2 flex flex-col gap-4 text-sm leading-7 text-marketing-fg-muted">
					<p>{feature.description}</p>
				</div>
			</div>
		</div>
	);
}

export function FeaturesSection() {
	const features: Feature[] = [
		{
			title: "vCard digitali",
			description:
				"Crea biglietti da visita digitali per ogni membro del team. Nome, ruolo, contatti, social — tutto in una pagina pubblica personalizzata.",
			icon: CreditCardIcon,
		},
		{
			title: "Card NFC fisiche",
			description:
				"Assegna card NFC ai tuoi collaboratori. Un tap sullo smartphone e il contatto viene condiviso istantaneamente.",
			icon: NfcIcon,
		},
		{
			title: "Branding personalizzato",
			description:
				"Personalizza colori, stile e effetto aurora delle pagine vCard con l'identità visiva della tua azienda.",
			icon: PaletteIcon,
		},
		{
			title: "Gestione centralizzata",
			description:
				"Gestisci tutte le vCard e card fisiche da un'unica dashboard. Aggiungi, modifica e disattiva in pochi click.",
			icon: LayoutDashboardIcon,
		},
	];

	return (
		<section id="features" className="py-16 scroll-mt-14">
			<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:gap-16 lg:px-10">
				{/* Header */}
				<div className="flex max-w-2xl flex-col gap-6">
					<div className="flex flex-col gap-2">
						<div className="text-sm font-semibold leading-7 text-marketing-fg-muted">
							Funzionalità
						</div>
						<h2
							className={cn(
								"text-pretty font-display text-[2rem] leading-10 tracking-tight",
								"text-marketing-fg",
								"sm:text-5xl sm:leading-14",
							)}
						>
							Tutto quello che serve per i biglietti da visita del tuo team
						</h2>
					</div>
					<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
						<p>
							Dalla creazione delle vCard alla distribuzione con card NFC, una
							piattaforma completa per gestire i contatti aziendali.
						</p>
					</div>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
					{features.map((feature) => (
						<FeatureCard key={feature.title} feature={feature} />
					))}
				</div>
			</div>
		</section>
	);
}

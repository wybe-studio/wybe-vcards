"use client";

import { cn } from "@/lib/utils";

interface Stat {
	value: string;
	label: string;
	description: string;
}

export function StatsSection() {
	const stats: Stat[] = [
		{
			value: "10K+",
			label: "Utenti attivi",
			description: "Una community in crescita in tutto il mondo",
		},
		{
			value: "99,9%",
			label: "Uptime",
			description: "Infrastruttura affidabile su cui puoi contare",
		},
		{
			value: "50+",
			label: "Integrazioni",
			description: "Collegati con i tuoi strumenti preferiti",
		},
		{
			value: "24/7",
			label: "Supporto",
			description: "Aiuto quando ne hai più bisogno",
		},
	];

	return (
		<section id="stats" className="py-16">
			<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:gap-16 lg:px-10">
				{/* Header */}
				<div className="flex max-w-2xl flex-col gap-6">
					<div className="flex flex-col gap-2">
						<div className="text-sm font-semibold leading-7 text-marketing-fg-muted">
							I numeri
						</div>
						<h2
							className={cn(
								"text-pretty font-display text-[2rem] leading-10 tracking-tight",
								"text-marketing-fg",
								"sm:text-5xl sm:leading-14",
							)}
						>
							Scelto da team in tutto il mondo
						</h2>
					</div>
					<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
						<p>
							Unisciti a migliaia di aziende che si affidano alla nostra
							piattaforma per far funzionare il proprio business ogni giorno.
						</p>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="relative rounded-lg bg-marketing-card p-6"
						>
							<div className="text-3xl font-semibold tracking-tight text-marketing-fg sm:text-4xl">
								{stat.value}
							</div>
							<div className="mt-2 text-sm font-medium text-marketing-fg">
								{stat.label}
							</div>
							<p className="mt-1 text-sm text-marketing-fg-muted">
								{stat.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

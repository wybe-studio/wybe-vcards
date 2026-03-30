"use client";

import { cn } from "@/lib/utils";

const changelog = [
	{
		version: "2.1.0",
		date: "Dicembre 2025",
		items: [
			{
				title: "Workspace per team",
				description: "Crea workspace separati per team o progetti diversi.",
			},
			{
				title: "Campi personalizzati",
				description:
					"Aggiungi i tuoi campi per tracciare i dati che contano per te.",
			},
			{
				title: "Ricerca più veloce",
				description:
					"I risultati di ricerca appaiono istantaneamente mentre digiti.",
			},
		],
	},
	{
		version: "2.0.0",
		date: "Novembre 2025",
		items: [
			{
				title: "Nuova dashboard",
				description:
					"Dashboard completamente riprogettata con insight migliori a colpo d'occhio.",
			},
			{
				title: "App mobile",
				description:
					"Accedi ai tuoi dati in movimento con le nostre nuove app iOS e Android.",
			},
			{
				title: "Integrazioni",
				description: "Collegati con Slack, Google Workspace e altro.",
			},
		],
	},
	{
		version: "1.0.0",
		date: "Ottobre 2025",
		items: [
			{
				title: "Lancio",
				description:
					"Prima release pubblica con le funzionalità principali per la collaborazione di team.",
			},
			{
				title: "Gestione team",
				description:
					"Invita i membri del team, assegna ruoli e lavorate insieme.",
			},
			{
				title: "Esportazione dati",
				description:
					"Esporta i tuoi dati in qualsiasi momento in formato CSV o JSON.",
			},
		],
	},
];

export function ChangelogSection() {
	return (
		<main className="isolate overflow-clip">
			{/* Hero Section */}
			<section className="py-16 pt-32 lg:pt-40" id="changelog-hero">
				<div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<h1
						className={cn(
							"text-balance font-display text-5xl leading-12 tracking-tight",
							"text-marketing-fg",
							"sm:text-[5rem] sm:leading-20",
						)}
					>
						Novità
					</h1>
					<div className="max-w-3xl text-lg leading-8 text-marketing-fg-muted">
						<p>
							Scopri cosa abbiamo realizzato. Nuove funzionalità e miglioramenti
							ogni mese.
						</p>
					</div>
				</div>
			</section>

			{/* Changelog Entries */}
			<section className="py-16" id="releases">
				<div className="mx-auto max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<div className="flex flex-col gap-16">
						{changelog.map((release) => (
							<div key={release.version} className="flex flex-col gap-6">
								{/* Version Header */}
								<div className="flex items-center gap-4">
									<span className="inline-flex rounded-full bg-marketing-accent px-3 py-1 text-sm font-medium text-primary-foreground">
										v{release.version}
									</span>
									<span className="text-sm text-marketing-fg-subtle">
										{release.date}
									</span>
								</div>

								{/* Release Items */}
								<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{release.items.map((item, itemIndex) => (
										<div
											key={itemIndex}
											className="flex flex-col gap-2 rounded-xl bg-marketing-card p-6"
										>
											<h3 className="font-semibold text-marketing-fg">
												{item.title}
											</h3>
											<p className="text-sm text-marketing-fg-muted">
												{item.description}
											</p>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</main>
	);
}

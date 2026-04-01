"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";

const stats = [
	{
		value: "2M+",
		description: "Attività completate ogni settimana da migliaia di team.",
	},
	{
		value: "99,98%",
		description: "Uptime - perché il tuo lavoro non si ferma mai.",
	},
];

const values = [
	{
		title: "Semplicità",
		description:
			"Crediamo che gli strumenti potenti non debbano essere complicati.",
	},
	{
		title: "Focus sul cliente",
		description:
			"Ogni funzionalità che costruiamo parte dalla comprensione di ciò che ti serve davvero.",
	},
	{
		title: "Affidabilità",
		description:
			"Puoi contare su di noi. Siamo qui quando hai bisogno, sempre.",
	},
	{
		title: "Miglioramento continuo",
		description: "Impariamo e miglioriamo costantemente in ciò che facciamo.",
	},
];

export function AboutSection() {
	return (
		<main className="isolate overflow-clip">
			{/* Hero Section */}
			<section className="py-16 pt-32 lg:pt-40" id="hero">
				<div className="mx-auto flex max-w-2xl flex-col gap-32 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<div className="flex flex-col gap-32">
						<div className="flex flex-col items-start gap-6">
							<h1
								className={cn(
									"text-balance font-display text-5xl leading-12 tracking-tight",
									"text-marketing-fg",
									"sm:text-[5rem] sm:leading-20",
								)}
							>
								Stiamo costruendo qualcosa di diverso.
							</h1>
							<div className="flex max-w-3xl flex-col gap-4 text-lg leading-8 text-marketing-fg-muted">
								<p>
									Un piccolo team con grandi ambizioni. La nostra missione è
									aiutare i team a lavorare meglio insieme - costruendo
									strumenti che non intralciano e ti lasciano concentrare su ciò
									che conta davvero.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="py-16" id="stats">
				<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:gap-16 lg:px-10">
					<div className="flex max-w-2xl flex-col gap-6">
						<div className="flex flex-col gap-2">
							<div className="text-sm font-semibold text-marketing-fg-muted">
								Costruito per scalare
							</div>
							<h2
								className={cn(
									"text-pretty font-display text-[2rem] leading-10 tracking-tight",
									"text-marketing-fg",
									"sm:text-5xl sm:leading-14",
								)}
							>
								La piattaforma che supporta team ovunque.
							</h2>
						</div>
						<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
							<p>
								{appConfig.appName} aiuta i team a lavorare in modo organizzato
								ed efficiente in tutto il mondo. Dalle piccole startup ai team
								enterprise, gestiamo milioni di attività ogni mese.
							</p>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
						{stats.map((stat) => (
							<div
								key={stat.value}
								className="relative rounded-lg bg-marketing-card p-6"
							>
								<div className="text-3xl font-semibold tracking-tight text-marketing-fg sm:text-4xl">
									{stat.value}
								</div>
								<p className="mt-2 text-sm text-marketing-fg-muted">
									{stat.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Values Section */}
			<section className="py-16" id="values">
				<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:gap-16 lg:px-10">
					<div className="flex max-w-2xl flex-col gap-6">
						<div className="flex flex-col gap-2">
							<h2
								className={cn(
									"text-pretty font-display text-[2rem] leading-10 tracking-tight",
									"text-marketing-fg",
									"sm:text-5xl sm:leading-14",
								)}
							>
								I nostri valori
							</h2>
						</div>
						<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
							<p>
								I principi che guidano le nostre decisioni e definiscono la
								nostra cultura.
							</p>
						</div>
					</div>
					<div>
						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
							{values.map((value) => (
								<div
									key={value.title}
									className="relative rounded-lg bg-marketing-card p-6"
								>
									<p className="font-semibold text-marketing-fg group-hover:text-marketing-accent transition-colors">
										{value.title}
									</p>
									<p className="mt-2 text-sm text-marketing-fg-muted">
										{value.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16" id="cta">
				<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<div className="flex flex-col gap-6">
						<div className="flex max-w-4xl flex-col gap-2">
							<h2
								className={cn(
									"text-pretty font-display text-[2rem] leading-10 tracking-tight",
									"text-marketing-fg",
									"sm:text-5xl sm:leading-14",
								)}
							>
								Pronto per iniziare?
							</h2>
						</div>
						<div className="max-w-3xl text-base leading-7 text-marketing-fg-muted text-pretty">
							<p>
								Unisciti a migliaia di team che già usano {appConfig.appName}{" "}
								per lavorare in modo più intelligente.
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<Link
							href="/auth/sign-up"
							className={cn(
								"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium",
								"bg-marketing-accent text-white hover:bg-marketing-accent-hover",
								"dark:bg-marketing-accent",
							)}
						>
							Inizia la prova gratuita
						</Link>
						<Link
							href="/contatti"
							className={cn(
								"group inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
								"text-marketing-fg hover:bg-marketing-card-hover",
								"dark:hover:bg-white/10",
							)}
						>
							Contattaci
							<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}

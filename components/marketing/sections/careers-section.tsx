"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const benefits = [
	{
		title: "Lavoro flessibile",
		description:
			"Lavora da dove vuoi. Ci interessano i risultati, non dove ti siedi.",
	},
	{
		title: "Team eccezionale",
		description:
			"Lavora con persone talentuose e gentili che hanno a cuore il buon lavoro.",
	},
	{
		title: "Spazio per crescere",
		description:
			"Affronta nuove sfide. Impara nuove competenze. Cresci professionalmente con noi.",
	},
];

const positions = [
	{
		title: "Software Engineer",
		department: "Engineering",
		description:
			"Costruisci funzionalità che aiutano migliaia di team a lavorare meglio. Ruolo full-stack.",
		type: "Full-time",
		location: "Remoto",
	},
	{
		title: "Product Designer",
		department: "Design",
		description:
			"Definisci l'esperienza utente del nostro prodotto. Ricerca, progetta e itera.",
		type: "Full-time",
		location: "Remoto",
	},
	{
		title: "Assistenza clienti",
		department: "Supporto",
		description:
			"Aiuta i nostri clienti ad avere successo. Risolvi problemi e rendi le persone felici.",
		type: "Full-time",
		location: "Remoto",
	},
	{
		title: "Marketing Manager",
		department: "Marketing",
		description:
			"Racconta la nostra storia. Aiuta più team a scoprire cosa stiamo costruendo.",
		type: "Full-time",
		location: "Remoto",
	},
];

export function CareersBenefitsSection() {
	return (
		<>
			{/* Hero Section */}
			<section className="py-16 pt-32 lg:pt-40" id="careers-hero">
				<div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<h1
						className={cn(
							"text-balance font-display text-5xl leading-12 tracking-tight",
							"text-marketing-fg",
							"sm:text-[5rem] sm:leading-20",
						)}
					>
						Unisciti al team
					</h1>
					<div className="max-w-3xl text-lg leading-8 text-marketing-fg-muted">
						<p>
							Cerchiamo persone che vogliono fare un lavoro significativo e
							divertirsi nel farlo. Aiutaci a costruire strumenti che i team
							amano.
						</p>
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="py-16" id="benefits">
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
								Perché lavorare con noi
							</h2>
						</div>
					</div>
					<div>
						<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
							{benefits.map((benefit) => (
								<li
									key={benefit.title}
									className="relative flex flex-col gap-4 rounded-lg bg-marketing-card p-6"
								>
									<div>
										<p className="font-semibold text-marketing-fg">
											{benefit.title}
										</p>
										<p className="mt-2 text-sm text-marketing-fg-muted">
											{benefit.description}
										</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		</>
	);
}

export function CareersPositionsSection() {
	return (
		<>
			{/* Open Positions */}
			<section className="py-16" id="positions">
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
								Posizioni aperte
							</h2>
						</div>
					</div>
					<div className="divide-y divide-marketing-border border-y border-marketing-border">
						{positions.map((position) => (
							<div
								key={position.title}
								className="flex flex-col justify-between gap-4 py-6 sm:flex-row sm:items-center"
							>
								<div className="flex-1">
									<div className="flex items-center gap-3">
										<h3 className="font-semibold text-marketing-fg">
											{position.title}
										</h3>
										<span className="inline-flex rounded-full bg-marketing-card-hover px-2 py-0.5 text-xs font-medium text-marketing-fg-hover">
											{position.department}
										</span>
									</div>
									<p className="mt-1 text-sm text-marketing-fg-muted">
										{position.description}
									</p>
									<div className="mt-2 flex gap-4 text-sm text-marketing-fg-subtle">
										<span>{position.type}</span>
										<span>{position.location}</span>
									</div>
								</div>
								<div className="shrink-0">
									<Link
										href="/contact"
										className={cn(
											"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium",
											"bg-marketing-card-hover text-marketing-fg hover:bg-marketing-accent/15",
											"dark:bg-marketing-card-hover",
										)}
									>
										Candidati
									</Link>
								</div>
							</div>
						))}
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
								Non trovi il ruolo giusto?
							</h2>
						</div>
						<div className="max-w-3xl text-base leading-7 text-marketing-fg-muted text-pretty">
							<p>
								Siamo sempre alla ricerca di persone talentuose. Inviaci il tuo
								curriculum e raccontaci come vorresti contribuire.
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<Link
							href="/contact"
							className={cn(
								"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium",
								"bg-marketing-accent text-white hover:bg-marketing-accent-hover",
								"dark:bg-marketing-accent",
							)}
						>
							Contattaci
						</Link>
						<Link
							href="/about"
							className={cn(
								"group inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
								"text-marketing-fg hover:bg-marketing-card-hover",
								"dark:hover:bg-white/10",
							)}
						>
							Scopri chi siamo
							<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
						</Link>
					</div>
				</div>
			</section>
		</>
	);
}

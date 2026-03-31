"use client";

import { ArrowRightIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function HeroSection() {
	return (
		<section id="hero" className="py-16 scroll-mt-14">
			<div className="mx-auto flex max-w-2xl flex-col gap-16 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
				<div className="flex flex-col gap-32">
					<div className="flex flex-col items-start gap-6">
						{/* Announcement Pill */}
						<Link
							href="#features"
							className={cn(
								"relative inline-flex max-w-full items-center gap-3 overflow-hidden rounded-md px-3.5 py-2 text-sm",
								"bg-marketing-card",
								"hover:bg-marketing-card-hover",
								"dark:ring-inset dark:ring-1 dark:ring-white/5",
								"sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-3 sm:py-0.5",
							)}
						>
							<span className="truncate text-pretty sm:truncate">
								Novità: Card NFC personalizzate per il tuo team
							</span>
							<span className="hidden h-3 w-px bg-marketing-card-hover sm:block" />
							<span className="inline-flex shrink-0 items-center gap-1 font-semibold">
								Scopri di più
								<ChevronRightIcon className="size-3" />
							</span>
						</Link>

						{/* Headline */}
						<h1
							className={cn(
								"max-w-5xl text-balance font-display text-5xl tracking-display-tight",
								"text-marketing-fg",
								"sm:text-5xl sm:leading-14",
								"lg:text-[5rem] lg:leading-20",
							)}
						>
							I biglietti da visita digitali per la tua azienda.
						</h1>

						{/* Description */}
						<div className="flex max-w-3xl flex-col gap-4 text-lg leading-8 text-marketing-fg-muted">
							<p>
								Crea e gestisci vCard digitali per tutto il team. Condividi
								contatti con un tap NFC o un link. Personalizza con i colori del
								tuo brand.
							</p>
						</div>

						{/* CTA Buttons */}
						<div className="flex items-center gap-4">
							<Link
								href="/auth/sign-up"
								className={cn(
									"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium",
									"bg-marketing-accent text-marketing-accent-fg hover:bg-marketing-accent-hover",
								)}
							>
								Inizia ora
							</Link>
							<Link
								href="#features"
								className={cn(
									"group inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
									"text-marketing-fg hover:bg-marketing-card-hover",
								)}
							>
								Scopri come funziona
								<ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

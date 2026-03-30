"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface Testimonial {
	name: string;
	role: string;
	company: string;
	quote: string;
	avatar: string;
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<figure className="flex flex-col justify-between gap-10 rounded-md bg-marketing-card p-6 text-sm">
			<blockquote className="flex flex-col gap-4">
				<p>"{testimonial.quote}"</p>
			</blockquote>
			<figcaption className="flex items-center gap-4">
				<div className="flex size-12 overflow-hidden rounded-full outline -outline-offset-1 outline-black/5 dark:outline-white/5">
					<Image
						src={testimonial.avatar}
						alt={testimonial.name}
						width={160}
						height={160}
						className="size-full object-cover bg-white/75 dark:bg-black/75"
					/>
				</div>
				<div>
					<p className="font-semibold text-marketing-fg">{testimonial.name}</p>
					<p className="text-marketing-fg-muted">
						{testimonial.role} presso {testimonial.company}
					</p>
				</div>
			</figcaption>
		</figure>
	);
}

export function TestimonialsSection() {
	const testimonials: Testimonial[] = [
		{
			name: "Sarah Chen",
			role: "CTO",
			company: "TechStart",
			quote:
				"Questa piattaforma ha completamente trasformato il modo in cui lavora il nostro team. Siamo più produttivi che mai.",
			avatar: "/marketing/avatars/woman-44.jpg",
		},
		{
			name: "Marcus Johnson",
			role: "Founder",
			company: "GrowthLabs",
			quote:
				"Il miglior investimento che abbiamo fatto. Scala con noi e funziona in modo impeccabile.",
			avatar: "/marketing/avatars/man-32.jpg",
		},
		{
			name: "Emily Rodriguez",
			role: "Operations Director",
			company: "Innovate Co",
			quote:
				"L'onboarding è stato impeccabile. Il nostro team era operativo in pochi giorni, non settimane.",
			avatar: "/marketing/avatars/woman-68.jpg",
		},
		{
			name: "David Kim",
			role: "Product Lead",
			company: "BuildFast",
			quote:
				"Gli insight e le analisi hanno cambiato il modo in cui prendiamo decisioni. Altamente consigliato.",
			avatar: "/marketing/avatars/man-75.jpg",
		},
		{
			name: "Priya Sharma",
			role: "Engineering Manager",
			company: "DevFlow",
			quote:
				"L'integrazione è stata facilissima. Tutto funziona perfettamente insieme.",
			avatar: "/marketing/avatars/woman-26.jpg",
		},
		{
			name: "Alex Turner",
			role: "Team Lead",
			company: "AgileWorks",
			quote:
				"Supporto eccezionale. Ogni domanda che abbiamo avuto ha ricevuto risposta in modo rapido e completo.",
			avatar: "/marketing/avatars/man-46.jpg",
		},
	];

	return (
		<section id="testimonials" className="py-16">
			<div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 md:max-w-3xl lg:max-w-7xl lg:gap-16 lg:px-10">
				{/* Header */}
				<div className="flex max-w-2xl flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h2
							className={cn(
								"text-pretty font-display text-[2rem] leading-10 tracking-tight",
								"text-marketing-fg",
								"sm:text-5xl sm:leading-14",
							)}
						>
							Amato dai team ovunque
						</h2>
					</div>
					<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
						<p>
							Scopri cosa dicono i nostri clienti della loro esperienza con la
							nostra piattaforma.
						</p>
					</div>
				</div>

				{/* Testimonials Grid */}
				<div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{testimonials.map((testimonial) => (
							<TestimonialCard
								key={testimonial.name}
								testimonial={testimonial}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

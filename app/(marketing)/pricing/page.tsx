import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { appConfig } from "@/config/app.config";
import { featuresConfig } from "@/config/features.config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "Prezzi",
	description: `Prezzi semplici e trasparenti per ${appConfig.appName}. Scegli il piano più adatto a te.`,
};

const pricingFaq = {
	headline: "Domande e risposte",
	items: [
		{
			question: "Serve una carta di credito per la prova gratuita?",
			answer:
				"Non è richiesta la carta di credito per iniziare la prova gratuita. Puoi esplorare tutte le funzionalità per 14 giorni prima di scegliere un piano.",
		},
		{
			question: "Tutto il mio team può usare lo stesso account?",
			answer:
				"Sì! Tutti i piani supportano più membri del team. Il numero di postazioni varia in base al piano e puoi aggiungere altri membri man mano che il team cresce.",
		},
		{
			question: "Quali metodi di pagamento accettate?",
			answer:
				"Accettiamo tutte le principali carte di credito (Visa, Mastercard e American Express) e possiamo organizzare la fatturazione per i piani annuali del livello Pro.",
		},
		{
			question: "Posso cambiare piano in seguito?",
			answer:
				"Assolutamente. Puoi fare upgrade o downgrade del tuo piano in qualsiasi momento. Le modifiche hanno effetto immediato e calcoleremo il pro-rata di conseguenza.",
		},
	],
};

const ctaContent = {
	headline: "Hai altre domande?",
	description:
		"Parla con qualcuno del nostro team commerciale che può aiutarti a trovare il piano giusto per le tue esigenze.",
	primaryCta: {
		text: "Scrivici",
		href: `mailto:${appConfig.contact.email}`,
	},
	secondaryCta: {
		text: "Prenota una demo",
		href: "/contatti",
	},
};

export default function PricingPage() {
	if (!featuresConfig.billing) {
		notFound();
	}

	return (
		<main className="isolate overflow-clip">
			{/* Hero Section */}
			<section className="py-16 pt-32 lg:pt-40" id="pricing">
				<div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 text-center md:max-w-3xl lg:max-w-7xl lg:px-10">
					<h1
						className={cn(
							"text-balance font-display text-5xl leading-12 tracking-tight",
							"text-marketing-fg",
							"sm:text-[5rem] sm:leading-20",
						)}
					>
						Prezzi
					</h1>
					<div className="max-w-xl text-lg leading-8 text-marketing-fg-muted">
						<p>
							Prezzi semplici e trasparenti che crescono con il tuo business.
							Inizia gratis e fai upgrade man mano che cresci.
						</p>
					</div>
				</div>
			</section>

			{/* Pricing Cards */}
			<PricingSection
				headline=""
				showFreePlans={true}
				showEnterprisePlans={false}
				defaultInterval="month"
			/>

			{/* FAQ */}
			<FaqSection content={pricingFaq} />

			{/* CTA */}
			<CtaSection content={ctaContent} centered />
		</main>
	);
}

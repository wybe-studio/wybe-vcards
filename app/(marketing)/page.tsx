import { CtaSection } from "@/components/marketing/sections/cta-section";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { FeaturesSection } from "@/components/marketing/sections/features-section";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { LatestArticlesSection } from "@/components/marketing/sections/latest-articles-section";
import { LogoCloudSection } from "@/components/marketing/sections/logo-cloud-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { StatsSection } from "@/components/marketing/sections/stats-section";
import { TestimonialsSection } from "@/components/marketing/sections/testimonials-section";
import { appConfig } from "@/config/app.config";
import { getAllPosts } from "@/lib/marketing/blog/posts";

function OrganizationJsonLd() {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: appConfig.appName,
		description: appConfig.description,
		url: appConfig.baseUrl,
		logo: `${appConfig.baseUrl}/favicon.svg`,
		contactPoint: {
			"@type": "ContactPoint",
			email: appConfig.contact.email,
			telephone: appConfig.contact.phone,
			contactType: "customer service",
		},
		address: {
			"@type": "PostalAddress",
			streetAddress: appConfig.contact.address,
		},
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
		/>
	);
}

function WebSiteJsonLd() {
	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: appConfig.appName,
		description: appConfig.description,
		url: appConfig.baseUrl,
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${appConfig.baseUrl}/blog?q={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
		/>
	);
}

export default async function HomePage() {
	const posts = await getAllPosts();

	const faqContent = {
		headline: "Domande e risposte",
		items: [
			{
				question: "Come posso iniziare?",
				answer:
					"Iniziare è semplice. Registrati con un account gratuito, completa il processo di onboarding e sarai operativo in pochi minuti.",
			},
			{
				question: "È disponibile una prova gratuita?",
				answer:
					"Sì, offriamo una prova gratuita di 14 giorni con accesso completo a tutte le funzionalità. Non è richiesta la carta di credito.",
			},
			{
				question: "Posso annullare l'abbonamento in qualsiasi momento?",
				answer:
					"Assolutamente. Puoi annullare il tuo abbonamento in qualsiasi momento dalle impostazioni del tuo account. Senza domande.",
			},
			{
				question: "Offrite assistenza clienti?",
				answer:
					"Forniamo assistenza clienti dedicata via email e chat. Il nostro team risponde di solito entro poche ore.",
			},
			{
				question: "I miei dati sono al sicuro?",
				answer:
					"La sicurezza è la nostra priorità. Utilizziamo crittografia standard di settore e seguiamo le migliori pratiche per proteggere i tuoi dati.",
			},
		],
	};

	const ctaContent = {
		headline: "Pronto per iniziare?",
		description:
			"Crea il tuo account gratuito oggi. Nessuna carta di credito richiesta.",
		primaryCta: {
			text: "Inizia la prova gratuita",
			href: "/auth/sign-up",
		},
		secondaryCta: {
			text: "Contatta il commerciale",
			href: "/contact",
		},
	};

	return (
		<>
			<OrganizationJsonLd />
			<WebSiteJsonLd />
			<HeroSection />
			<LogoCloudSection />
			<FeaturesSection />
			<StatsSection />
			<TestimonialsSection />
			<FaqSection content={faqContent} />
			<PricingSection />
			<LatestArticlesSection posts={posts} />
			<CtaSection content={ctaContent} />
		</>
	);
}

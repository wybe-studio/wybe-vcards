import { CtaSection } from "@/components/marketing/sections/cta-section";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { FeaturesSection } from "@/components/marketing/sections/features-section";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { appConfig } from "@/config/app.config";

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
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
		/>
	);
}

export default function HomePage() {
	const faqContent = {
		headline: "Domande e risposte",
		items: [
			{
				question: "Cos'è una vCard digitale?",
				answer:
					"È un biglietto da visita digitale accessibile tramite link o QR code. Contiene nome, ruolo, contatti e link social, sempre aggiornati.",
			},
			{
				question: "Come funzionano le card NFC?",
				answer:
					"Ogni card NFC è collegata a una vCard. Basta avvicinare la card a uno smartphone per aprire automaticamente la pagina del contatto.",
			},
			{
				question: "Posso personalizzare lo stile delle pagine?",
				answer:
					"Sì, puoi impostare i colori del tuo brand, l'effetto aurora di sfondo e lo stile dei pulsanti per tutte le vCard della tua organizzazione.",
			},
			{
				question: "Quante vCard posso creare?",
				answer:
					"Il numero di vCard e card NFC dipende dal piano della tua organizzazione. L'amministratore della piattaforma configura i limiti.",
			},
			{
				question: "I contatti possono salvare i dati sul telefono?",
				answer:
					"Sì, ogni pagina vCard ha un pulsante per scaricare il file .vcf e salvare il contatto direttamente nella rubrica.",
			},
		],
	};

	const ctaContent = {
		headline: "Pronto a digitalizzare i tuoi biglietti da visita?",
		description:
			"Crea il tuo account e inizia a gestire le vCard del tuo team.",
		primaryCta: {
			text: "Inizia ora",
			href: "/contatti",
		},
		secondaryCta: {
			text: "Contattaci",
			href: "/contatti",
		},
	};

	return (
		<>
			<OrganizationJsonLd />
			<WebSiteJsonLd />
			<HeroSection />
			<FeaturesSection />
			<FaqSection content={faqContent} />
			<CtaSection content={ctaContent} />
		</>
	);
}

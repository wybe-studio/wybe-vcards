import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContactSection } from "@/components/marketing/sections/contact-section";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { appConfig } from "@/config/app.config";

export const metadata: Metadata = {
	title: "Contatti",
	description: "Mettiti in contatto con noi. Saremo felici di sentirti.",
};

const contactFaq = {
	headline: "Domande e risposte",
	items: [
		{
			question: "Quanto velocemente riceverò una risposta?",
			answer:
				"Di solito rispondiamo entro 24 ore nei giorni lavorativi. Per questioni urgenti, indicalo nel tuo messaggio.",
		},
		{
			question: "Offrite piani enterprise?",
			answer:
				"Sì! Offriamo piani enterprise personalizzati con supporto dedicato, integrazioni custom e prezzi su volume. Contattaci per discutere le tue esigenze.",
		},
		{
			question: "Posso prenotare una demo?",
			answer:
				"Assolutamente. Inviaci un messaggio per richiedere una demo e organizzeremo un appuntamento che funzioni per te.",
		},
		{
			question: "Qual è il modo migliore per ottenere supporto tecnico?",
			answer:
				"Per i clienti esistenti, il modo più veloce è tramite la chat di supporto in-app. Per richieste generali, questo modulo di contatto è perfetto.",
		},
	],
};

export default function ContactPage() {
	// Redirect to home if contact page is disabled
	if (!appConfig.contact.enabled) {
		redirect("/");
	}

	return (
		<>
			<ContactSection />
			<FaqSection content={contactFaq} />
		</>
	);
}

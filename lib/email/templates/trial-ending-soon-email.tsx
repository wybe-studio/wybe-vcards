import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import type * as React from "react";

export type TrialEndingSoonEmailProps = {
	appName: string;
	organizationName: string;
	userName: string;
	planName: string;
	trialEndDate: string;
	daysRemaining: number;
	billingSettingsLink: string;
};

function TrialEndingSoonEmail({
	appName,
	organizationName,
	userName,
	planName,
	trialEndDate,
	daysRemaining,
	billingSettingsLink,
}: TrialEndingSoonEmailProps): React.JSX.Element {
	const daysText = daysRemaining === 1 ? "1 giorno" : `${daysRemaining} giorni`;

	return (
		<Html>
			<Head />
			<Preview>
				Il tuo periodo di prova {planName} per {organizationName} scade tra{" "}
				{daysText}
			</Preview>
			<Tailwind>
				<Body className="m-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded-sm border border-[#eaeaea] border-solid p-[20px]">
						<Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
							Il tuo periodo di prova sta per scadere
						</Heading>
						<Text className="text-[14px] text-black leading-[24px]">
							Ciao {userName},
						</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Il tuo periodo di prova gratuito del piano{" "}
							<strong>{planName}</strong> per{" "}
							<strong>{organizationName}</strong> scadrà tra{" "}
							<strong>{daysText}</strong>.
						</Text>

						{/* Trial Details */}
						<Section className="my-[24px] rounded-md border border-[#eaeaea] border-solid bg-[#f9f9f9] p-[16px]">
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Piano:</strong> {planName}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Scadenza prova:</strong> {trialEndDate}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Giorni rimanenti:</strong> {daysRemaining}
							</Text>
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Per continuare a usufruire di tutte le funzionalità di {planName}{" "}
							senza interruzioni, aggiungi un metodo di pagamento prima della
							scadenza del periodo di prova. Il tuo abbonamento inizierà
							automaticamente al termine del periodo di prova.
						</Text>

						<Section className="my-[32px] text-center">
							<Button
								href={billingSettingsLink}
								className="rounded-sm bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
							>
								Aggiungi metodo di pagamento
							</Button>
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Se decidi di non continuare, non è necessaria alcuna azione. Il
							tuo account passerà automaticamente al piano gratuito al termine
							del periodo di prova.
						</Text>

						<Text className="text-[14px] text-black leading-[24px]">
							Hai domande? Rispondi a questa email o contatta il nostro team di
							supporto.
						</Text>

						<Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
						<Text className="text-[#666666] text-[12px] leading-[24px]">
							Hai ricevuto questa email perché sei un amministratore della
							fatturazione per {organizationName} su {appName}.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

TrialEndingSoonEmail.PreviewProps = {
	appName: "Acme",
	organizationName: "Evil Corp",
	userName: "John Doe",
	planName: "Pro",
	trialEndDate: "December 20, 2024",
	daysRemaining: 3,
	billingSettingsLink:
		"https://example.com/organization/settings?tab=subscription",
} satisfies TrialEndingSoonEmailProps;

export default TrialEndingSoonEmail;
export { TrialEndingSoonEmail };

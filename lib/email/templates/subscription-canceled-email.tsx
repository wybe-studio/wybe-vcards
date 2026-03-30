import {
	Body,
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

export type SubscriptionCanceledEmailProps = {
	appName: string;
	organizationName: string;
	userName: string;
	planName: string;
	cancelDate: string;
	accessEndDate: string;
};

function SubscriptionCanceledEmail({
	appName,
	organizationName,
	userName,
	planName,
	cancelDate,
	accessEndDate,
}: SubscriptionCanceledEmailProps): React.JSX.Element {
	return (
		<Html>
			<Head />
			<Preview>
				Il tuo abbonamento {planName} per {organizationName} è stato cancellato
			</Preview>
			<Tailwind>
				<Body className="m-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded-sm border border-[#eaeaea] border-solid p-[20px]">
						<Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
							Abbonamento cancellato
						</Heading>
						<Text className="text-[14px] text-black leading-[24px]">
							Ciao {userName},
						</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Questa email conferma che l'abbonamento per{" "}
							<strong>{organizationName}</strong> è stato cancellato.
						</Text>

						{/* Cancellation Details */}
						<Section className="my-[24px] rounded-md border border-[#eaeaea] border-solid bg-[#f9f9f9] p-[16px]">
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Piano:</strong> {planName}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Cancellato il:</strong> {cancelDate}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Accesso fino al:</strong> {accessEndDate}
							</Text>
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Continuerai ad avere accesso a tutte le funzionalità di {planName}{" "}
							fino al <strong>{accessEndDate}</strong>. Dopo questa data, la tua
							organizzazione passerà al piano gratuito.
						</Text>

						<Text className="text-[14px] text-black leading-[24px]">
							Se cambi idea, puoi riattivare il tuo abbonamento in qualsiasi
							momento prima della data di scadenza dell'accesso dalle
							impostazioni di fatturazione della tua organizzazione.
						</Text>

						<Text className="text-[14px] text-black leading-[24px]">
							Ci dispiace vederti andare. Se hai dei feedback sulla tua
							esperienza, saremo felici di ascoltarti.
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

SubscriptionCanceledEmail.PreviewProps = {
	appName: "Acme",
	organizationName: "Evil Corp",
	userName: "John Doe",
	planName: "Pro",
	cancelDate: "December 15, 2024",
	accessEndDate: "January 15, 2025",
} satisfies SubscriptionCanceledEmailProps;

export default SubscriptionCanceledEmail;
export { SubscriptionCanceledEmail };

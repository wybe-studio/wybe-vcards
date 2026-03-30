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

export type DisputeReceivedEmailProps = {
	appName: string;
	organizationName: string;
	recipientName: string; // Admin name
	amount: string;
	currency: string;
	disputeId: string;
	reason: string;
	evidenceDueBy: string;
	disputeLink: string;
};

function DisputeReceivedEmail({
	appName,
	organizationName,
	recipientName,
	amount,
	currency,
	disputeId,
	reason,
	evidenceDueBy,
	disputeLink,
}: DisputeReceivedEmailProps): React.JSX.Element {
	return (
		<Html>
			<Head />
			<Preview>URGENTE: Contestazione ricevuta per {organizationName}</Preview>
			<Tailwind>
				<Body className="m-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded-sm border border-[#eaeaea] border-solid p-[20px]">
						<Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-red-600">
							Azione richiesta: Contestazione ricevuta
						</Heading>
						<Text className="text-[14px] text-black leading-[24px]">
							Ciao {recipientName},
						</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Una contestazione di pagamento (chargeback) è stata presentata
							contro <strong>{organizationName}</strong>. Questo significa che
							un cliente ha contestato un addebito presso la propria banca.
						</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Per evitare di perdere i fondi e incorrere in una commissione per
							contestazione, devi rispondere con le prove entro la scadenza.
						</Text>

						{/* Dispute Details */}
						<Section className="my-[24px] rounded-md border border-[#eaeaea] border-solid bg-[#f9f9f9] p-[16px]">
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Importo:</strong> {amount} {currency.toUpperCase()}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Motivo:</strong> {reason}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>ID contestazione:</strong> {disputeId}
							</Text>
							<Text className="m-0 text-[14px] text-black leading-[24px] text-red-600 font-semibold">
								<strong>Scadenza prove:</strong> {evidenceDueBy}
							</Text>
						</Section>

						<Section className="my-[32px] text-center">
							<Button
								href={disputeLink}
								className="rounded-sm bg-[#dc2626] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
							>
								Visualizza e rispondi alla contestazione
							</Button>
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Se non rispondi entro la scadenza, la contestazione verrà
							probabilmente persa e i fondi saranno ritirati definitivamente.
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

DisputeReceivedEmail.PreviewProps = {
	appName: "Acme",
	organizationName: "Evil Corp",
	recipientName: "Jane Doe",
	amount: "49.00",
	currency: "usd",
	disputeId: "dp_123456789",
	reason: "fraudulent",
	evidenceDueBy: "January 15, 2026",
	disputeLink: "https://dashboard.stripe.com/disputes/dp_123456789",
} satisfies DisputeReceivedEmailProps;

export default DisputeReceivedEmail;
export { DisputeReceivedEmail };

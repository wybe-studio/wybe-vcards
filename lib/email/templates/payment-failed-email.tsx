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

export type PaymentFailedEmailProps = {
	appName: string;
	organizationName: string;
	userName: string;
	amount: string;
	currency: string;
	updatePaymentLink: string;
	invoiceId?: string;
};

function PaymentFailedEmail({
	appName,
	organizationName,
	userName,
	amount,
	currency,
	updatePaymentLink,
	invoiceId,
}: PaymentFailedEmailProps): React.JSX.Element {
	return (
		<Html>
			<Head />
			<Preview>
				Pagamento fallito per {organizationName} - Azione richiesta
			</Preview>
			<Tailwind>
				<Body className="m-auto bg-white px-2 font-sans">
					<Container className="mx-auto my-[40px] max-w-[465px] rounded-sm border border-[#eaeaea] border-solid p-[20px]">
						<Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
							Pagamento fallito
						</Heading>
						<Text className="text-[14px] text-black leading-[24px]">
							Ciao {userName},
						</Text>
						<Text className="text-[14px] text-black leading-[24px]">
							Non siamo riusciti a elaborare il pagamento per l'abbonamento di{" "}
							<strong>{organizationName}</strong>.
						</Text>

						{/* Payment Details */}
						<Section className="my-[24px] rounded-md border border-[#eaeaea] border-solid bg-[#f9f9f9] p-[16px]">
							<Text className="m-0 text-[14px] text-black leading-[24px]">
								<strong>Importo:</strong> {amount} {currency.toUpperCase()}
							</Text>
							{invoiceId && (
								<Text className="m-0 text-[14px] text-black leading-[24px]">
									<strong>Fattura:</strong> {invoiceId}
								</Text>
							)}
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Per evitare interruzioni del servizio, aggiorna il tuo metodo di
							pagamento il prima possibile. Il tuo abbonamento rimarrà attivo
							per un periodo limitato mentre ritentiamo il pagamento.
						</Text>

						<Section className="my-[32px] text-center">
							<Button
								href={updatePaymentLink}
								className="rounded-sm bg-[#dc2626] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
							>
								Aggiorna metodo di pagamento
							</Button>
						</Section>

						<Text className="text-[14px] text-black leading-[24px]">
							Se ritieni che si tratti di un errore o hai già aggiornato il tuo
							metodo di pagamento, ignora questa email. Per qualsiasi domanda,
							contatta il nostro team di supporto.
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

PaymentFailedEmail.PreviewProps = {
	appName: "Acme",
	organizationName: "Evil Corp",
	userName: "John Doe",
	amount: "29.00",
	currency: "usd",
	updatePaymentLink:
		"https://example.com/organization/settings?tab=subscription",
	invoiceId: "INV-2024-001234",
} satisfies PaymentFailedEmailProps;

export default PaymentFailedEmail;
export { PaymentFailedEmail };

import { render } from "@react-email/render";
import { sendEmail } from "./resend";
import type { ContactFormEmailProps } from "./templates/contact-form-email";
import type { DisputeReceivedEmailProps } from "./templates/dispute-received-email";
import type { OrganizationInvitationEmailProps } from "./templates/organization-invitation-email";
import type { PaymentFailedEmailProps } from "./templates/payment-failed-email";
import type { RevokedInvitationEmailProps } from "./templates/revoked-invitation-email";
import type { SubscriptionCanceledEmailProps } from "./templates/subscription-canceled-email";
import type { TrialEndingSoonEmailProps } from "./templates/trial-ending-soon-email";
export async function sendOrganizationInvitationEmail(
	input: OrganizationInvitationEmailProps & { recipient: string },
): Promise<void> {
	const { OrganizationInvitationEmail } = await import(
		"./templates/organization-invitation-email"
	);
	const component = OrganizationInvitationEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: "Invito all'organizzazione",
		html,
		text,
	});
}

export async function sendRevokedInvitationEmail(
	input: RevokedInvitationEmailProps & { recipient: string },
): Promise<void> {
	const { RevokedInvitationEmail } = await import(
		"./templates/revoked-invitation-email"
	);
	const component = RevokedInvitationEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: "Invito revocato",
		html,
		text,
	});
}

export async function sendPaymentFailedEmail(
	input: PaymentFailedEmailProps & { recipient: string },
): Promise<void> {
	const { PaymentFailedEmail } = await import(
		"./templates/payment-failed-email"
	);
	const component = PaymentFailedEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: `Pagamento fallito per ${input.organizationName} - Azione richiesta`,
		html,
		text,
	});
}

export async function sendSubscriptionCanceledEmail(
	input: SubscriptionCanceledEmailProps & { recipient: string },
): Promise<void> {
	const { SubscriptionCanceledEmail } = await import(
		"./templates/subscription-canceled-email"
	);
	const component = SubscriptionCanceledEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: `Il tuo abbonamento ${input.planName} è stato cancellato`,
		html,
		text,
	});
}

export async function sendTrialEndingSoonEmail(
	input: TrialEndingSoonEmailProps & { recipient: string },
): Promise<void> {
	const { TrialEndingSoonEmail } = await import(
		"./templates/trial-ending-soon-email"
	);
	const component = TrialEndingSoonEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	const daysText =
		input.daysRemaining === 1 ? "1 giorno" : `${input.daysRemaining} giorni`;
	await sendEmail({
		recipient: input.recipient,
		subject: `Il tuo periodo di prova ${input.planName} scade tra ${daysText}`,
		html,
		text,
	});
}

export async function sendContactFormEmail(
	input: ContactFormEmailProps & { recipient: string },
): Promise<void> {
	const { ContactFormEmail } = await import("./templates/contact-form-email");
	const component = ContactFormEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: `Nuovo messaggio dal modulo di contatto da ${input.firstName} ${input.lastName}`,
		html,
		text,
		replyTo: input.email,
	});
}

export async function sendDisputeReceivedEmail(
	input: DisputeReceivedEmailProps & { recipient: string },
): Promise<void> {
	const { DisputeReceivedEmail } = await import(
		"./templates/dispute-received-email"
	);
	const component = DisputeReceivedEmail(input);
	const html = await render(component);
	const text = await render(component, { plainText: true });

	await sendEmail({
		recipient: input.recipient,
		subject: `URGENTE: Contestazione ricevuta per ${input.organizationName}`,
		html,
		text,
	});
}

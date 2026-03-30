import "server-only";

import { appConfig } from "@/config/app.config";
import {
	sendDisputeReceivedEmail,
	sendPaymentFailedEmail,
	sendSubscriptionCanceledEmail,
	sendTrialEndingSoonEmail,
} from "@/lib/email";
import { MemberRole } from "@/lib/enums";
import { LoggerFactory } from "@/lib/logger/factory";
import { createAdminClient } from "@/lib/supabase/admin";

const logger = LoggerFactory.getLogger("billing-notifications");

/**
 * Get organization admins (owners and admins) with their email addresses
 * Optimized to filter in SQL instead of fetching all members
 */
async function getOrganizationAdmins(
	organizationId: string,
): Promise<Array<{ email: string; name: string }>> {
	const adminRoles: MemberRole[] = [MemberRole.owner, MemberRole.admin];
	const adminClient = createAdminClient();

	const { data: members } = await adminClient
		.from("member")
		.select("user:user_id(email, name)")
		.eq("organization_id", organizationId)
		.in("role", adminRoles);

	if (!members) return [];

	return members
		.map((m) => {
			const user = Array.isArray(m.user) ? m.user[0] : m.user;
			if (!user || !("email" in user) || !("name" in user)) return null;
			return { email: user.email as string, name: user.name as string };
		})
		.filter((m): m is { email: string; name: string } => m !== null);
}

/**
 * Get organization name by ID
 */
async function getOrganizationName(
	organizationId: string,
): Promise<string | null> {
	const adminClient = createAdminClient();
	const { data: org } = await adminClient
		.from("organization")
		.select("name")
		.eq("id", organizationId)
		.single();
	return org?.name ?? null;
}

/**
 * Send payment failed notification to all organization admins
 */
export async function sendPaymentFailedNotification(params: {
	organizationId: string;
	amount: number;
	currency: string;
	invoiceId?: string;
}): Promise<void> {
	const { organizationId, amount, currency, invoiceId } = params;

	try {
		// Get organization name
		const organizationName = await getOrganizationName(organizationId);
		if (!organizationName) {
			logger.error("Organization not found for payment failed notification", {
				organizationId,
			});
			return;
		}

		// Get all admins
		const admins = await getOrganizationAdmins(organizationId);
		if (admins.length === 0) {
			logger.warn("No admins found for organization", { organizationId });
			return;
		}

		// Format amount
		const formattedAmount = new Intl.NumberFormat("it-IT", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);

		// Build update payment link
		const updatePaymentLink = `${appConfig.baseUrl}/dashboard/organization/settings?tab=subscription`;

		// Send email to all admins
		const emailPromises = admins.map((admin) =>
			sendPaymentFailedEmail({
				recipient: admin.email,
				appName: appConfig.appName,
				organizationName,
				userName: admin.name,
				amount: formattedAmount,
				currency,
				updatePaymentLink,
				invoiceId,
			}),
		);

		await Promise.allSettled(emailPromises);

		logger.info("Payment failed notifications sent", {
			organizationId,
			recipientCount: admins.length,
		});
	} catch (error) {
		logger.error("Failed to send payment failed notifications", {
			organizationId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

/**
 * Send subscription canceled notification to all organization admins
 */
export async function sendSubscriptionCanceledNotification(params: {
	organizationId: string;
	planName: string;
	cancelDate: Date;
	accessEndDate: Date;
}): Promise<void> {
	const { organizationId, planName, cancelDate, accessEndDate } = params;

	try {
		// Get organization name
		const organizationName = await getOrganizationName(organizationId);
		if (!organizationName) {
			logger.error(
				"Organization not found for subscription canceled notification",
				{ organizationId },
			);
			return;
		}

		// Get all admins
		const admins = await getOrganizationAdmins(organizationId);
		if (admins.length === 0) {
			logger.warn("No admins found for organization", { organizationId });
			return;
		}

		// Format dates
		const formattedCancelDate = cancelDate.toLocaleDateString("it-IT", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		const formattedAccessEndDate = accessEndDate.toLocaleDateString("it-IT", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		// Send email to all admins
		const emailPromises = admins.map((admin) =>
			sendSubscriptionCanceledEmail({
				recipient: admin.email,
				appName: appConfig.appName,
				organizationName,
				userName: admin.name,
				planName,
				cancelDate: formattedCancelDate,
				accessEndDate: formattedAccessEndDate,
			}),
		);

		await Promise.allSettled(emailPromises);

		logger.info("Subscription canceled notifications sent", {
			organizationId,
			recipientCount: admins.length,
		});
	} catch (error) {
		logger.error("Failed to send subscription canceled notifications", {
			organizationId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

/**
 * Send trial ending soon notification to all organization admins
 */
export async function sendTrialEndingSoonNotification(params: {
	organizationId: string;
	planName: string;
	trialEndDate: Date;
	daysRemaining: number;
}): Promise<void> {
	const { organizationId, planName, trialEndDate, daysRemaining } = params;

	try {
		// Get organization name
		const organizationName = await getOrganizationName(organizationId);
		if (!organizationName) {
			logger.error(
				"Organization not found for trial ending soon notification",
				{ organizationId },
			);
			return;
		}

		// Get all admins
		const admins = await getOrganizationAdmins(organizationId);
		if (admins.length === 0) {
			logger.warn("No admins found for organization", { organizationId });
			return;
		}

		// Format trial end date
		const formattedTrialEndDate = trialEndDate.toLocaleDateString("it-IT", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		// Build billing settings link
		const billingSettingsLink = `${appConfig.baseUrl}/dashboard/organization/settings?tab=subscription`;

		// Send email to all admins
		const emailPromises = admins.map((admin) =>
			sendTrialEndingSoonEmail({
				recipient: admin.email,
				appName: appConfig.appName,
				organizationName,
				userName: admin.name,
				planName,
				trialEndDate: formattedTrialEndDate,
				daysRemaining,
				billingSettingsLink,
			}),
		);

		await Promise.allSettled(emailPromises);

		logger.info("Trial ending soon notifications sent", {
			organizationId,
			recipientCount: admins.length,
			daysRemaining,
		});
	} catch (error) {
		logger.error("Failed to send trial ending soon notifications", {
			organizationId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

/**
 * Send dispute/chargeback notification to all organization admins
 * Disputes require immediate attention as they can result in fund loss
 */
export async function sendDisputeNotification(params: {
	organizationId: string;
	disputeId: string;
	reason: string;
	amount: number;
	currency: string;
	evidenceDueBy?: Date;
}): Promise<void> {
	const { organizationId, disputeId, reason, amount, currency, evidenceDueBy } =
		params;

	try {
		// Get organization name
		const organizationName = await getOrganizationName(organizationId);
		if (!organizationName) {
			logger.error("Organization not found for dispute notification", {
				organizationId,
			});
			return;
		}

		// Get all admins
		const admins = await getOrganizationAdmins(organizationId);
		if (admins.length === 0) {
			logger.warn("No admins found for organization", { organizationId });
			return;
		}

		// Format amount
		const formattedAmount = new Intl.NumberFormat("it-IT", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);

		// Format evidence due date if available
		const formattedDueBy = evidenceDueBy
			? evidenceDueBy.toLocaleDateString("it-IT", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "Sconosciuta";

		// Build Stripe dashboard link for dispute
		const disputeLink = `https://dashboard.stripe.com/disputes/${disputeId}`;

		// Log warning - disputes are critical
		logger.warn("Sending dispute notification", {
			organizationId,
			disputeId,
			reason,
			amount: formattedAmount,
			evidenceDueBy: formattedDueBy,
			recipientCount: admins.length,
		});

		// Send email to all admins
		const emailPromises = admins.map((admin) =>
			sendDisputeReceivedEmail({
				recipient: admin.email,
				appName: appConfig.appName,
				organizationName,
				recipientName: admin.name,
				amount: formattedAmount,
				currency,
				disputeId,
				reason,
				evidenceDueBy: formattedDueBy,
				disputeLink,
			}),
		);

		await Promise.allSettled(emailPromises);

		logger.info("Dispute notifications sent", {
			organizationId,
			recipientCount: admins.length,
		});
	} catch (error) {
		logger.error("Failed to send dispute notifications", {
			organizationId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

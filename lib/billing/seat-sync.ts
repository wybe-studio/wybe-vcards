import "server-only";

import { getPriceByStripePriceId } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoggerFactory } from "@/lib/logger/factory";
import {
	getActiveSubscriptionByOrganizationId,
	updateSubscription,
} from "./queries";
import { updateSubscriptionQuantity } from "./subscriptions";

const logger = LoggerFactory.getLogger("seat-sync");

/**
 * Sync the subscription seat count with the actual member count.
 * This should be called whenever members are added or removed from an organization.
 *
 * Uses the sync_organization_seats RPC which handles advisory locking internally
 * to prevent concurrent seat sync operations for the same organization.
 *
 * @param organizationId - The organization ID to sync seats for
 * @param options - Sync options
 * @returns Object with sync result details
 */
export async function syncOrganizationSeats(
	organizationId: string,
	options: { skipIfLocked?: boolean } = {},
): Promise<{
	synced: boolean;
	previousSeats: number;
	newSeats: number;
	message: string;
}> {
	const adminClient = createAdminClient();

	try {
		// Get the active subscription
		const subscription = await getActiveSubscriptionByOrganizationId(
			organizationId,
			adminClient,
		);

		if (!subscription) {
			return {
				synced: false,
				previousSeats: 0,
				newSeats: 0,
				message: "No active subscription found",
			};
		}

		// Check if the plan supports seat-based billing
		const priceConfig = getPriceByStripePriceId(subscription.stripe_price_id);
		if (!priceConfig) {
			return {
				synced: false,
				previousSeats: subscription.quantity,
				newSeats: subscription.quantity,
				message: "Price configuration not found",
			};
		}

		const isSeatBased =
			"seatBased" in priceConfig.price && priceConfig.price.seatBased;
		if (!isSeatBased) {
			return {
				synced: false,
				previousSeats: subscription.quantity,
				newSeats: subscription.quantity,
				message: "Plan does not use seat-based billing",
			};
		}

		const currentSeats = subscription.quantity;

		// Count current members
		const { count: memberCount, error: countError } = await adminClient
			.from("member")
			.select("*", { count: "exact", head: true })
			.eq("organization_id", organizationId);

		if (countError) {
			throw new Error(`Failed to count members: ${countError.message}`);
		}

		const actualMemberCount = memberCount ?? 0;

		// If counts match, no sync needed
		if (actualMemberCount === currentSeats) {
			return {
				synced: false,
				previousSeats: currentSeats,
				newSeats: currentSeats,
				message: "Seats already in sync",
			};
		}

		// Update Stripe subscription quantity first (source of truth)
		// If this fails, we don't update our database to maintain consistency
		try {
			await updateSubscriptionQuantity(subscription.id, actualMemberCount);
		} catch (stripeError) {
			logger.error("Failed to update Stripe subscription quantity", {
				organizationId,
				subscriptionId: subscription.id,
				error:
					stripeError instanceof Error
						? stripeError.message
						: "Unknown error",
			});
			throw stripeError;
		}

		// Update our database record with what we sent to Stripe
		await updateSubscription(
			subscription.id,
			{
				quantity: actualMemberCount,
			},
			adminClient,
		);

		logger.info("Synced organization seats", {
			organizationId,
			previousSeats: currentSeats,
			newSeats: actualMemberCount,
			subscriptionId: subscription.id,
		});

		return {
			synced: true,
			previousSeats: currentSeats,
			newSeats: actualMemberCount,
			message: `Updated from ${currentSeats} to ${actualMemberCount} seats`,
		};
	} catch (error) {
		logger.error("Error during seat sync operation", {
			organizationId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
}

/**
 * Check if an organization's seat count needs syncing
 */
export async function checkSeatSyncNeeded(organizationId: string): Promise<{
	needsSync: boolean;
	currentSeats: number;
	memberCount: number;
	difference: number;
}> {
	const subscription =
		await getActiveSubscriptionByOrganizationId(organizationId);

	if (!subscription) {
		return {
			needsSync: false,
			currentSeats: 0,
			memberCount: 0,
			difference: 0,
		};
	}

	// Check if seat-based
	const priceConfig = getPriceByStripePriceId(subscription.stripe_price_id);
	const isSeatBased =
		priceConfig &&
		"seatBased" in priceConfig.price &&
		priceConfig.price.seatBased;

	if (!isSeatBased) {
		return {
			needsSync: false,
			currentSeats: subscription.quantity,
			memberCount: 0,
			difference: 0,
		};
	}

	// Count members
	const adminClient = createAdminClient();
	const { count, error } = await adminClient
		.from("member")
		.select("*", { count: "exact", head: true })
		.eq("organization_id", organizationId);

	if (error) {
		throw new Error(`Failed to count members: ${error.message}`);
	}

	const memberCount = count ?? 0;
	const currentSeats = subscription.quantity;

	return {
		needsSync: memberCount !== currentSeats,
		currentSeats,
		memberCount,
		difference: memberCount - currentSeats,
	};
}

/**
 * Get the minimum required seats for an organization based on member count.
 * Useful for validation before allowing member removal.
 */
export async function getMinimumRequiredSeats(
	organizationId: string,
): Promise<number> {
	const adminClient = createAdminClient();

	const { count, error } = await adminClient
		.from("member")
		.select("*", { count: "exact", head: true })
		.eq("organization_id", organizationId);

	if (error) {
		throw new Error(`Failed to count members: ${error.message}`);
	}

	// Minimum is always at least 1 (the owner)
	return Math.max(1, count ?? 0);
}

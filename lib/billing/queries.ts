import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { Database, Tables, TablesInsert } from "@/lib/supabase/database.types";
import {
	getPlanByStripePriceId,
	getPriceByStripePriceId,
} from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivePlanInfo } from "./types";

type AdminClient = SupabaseClient<Database>;

// ============================================================================
// SUBSCRIPTION QUERIES
// ============================================================================

export type SubscriptionInsert = TablesInsert<"subscription">;
export type SubscriptionSelect = Tables<"subscription">;

export async function createSubscription(
	data: SubscriptionInsert,
): Promise<SubscriptionSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("subscription")
		.upsert(data, { onConflict: "id" })
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to create/upsert subscription: ${error.message}`);
	}

	return result!;
}

export async function updateSubscription(
	id: string,
	data: Partial<Omit<SubscriptionInsert, "id">>,
	db?: AdminClient,
): Promise<SubscriptionSelect | null> {
	const client = db ?? createAdminClient();

	const { data: result, error } = await client
		.from("subscription")
		.update(data)
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		// Not found
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to update subscription: ${error.message}`);
	}

	return result;
}

export async function deleteSubscription(id: string): Promise<void> {
	const adminClient = createAdminClient();

	const { error } = await adminClient
		.from("subscription")
		.delete()
		.eq("id", id);

	if (error) {
		throw new Error(`Failed to delete subscription: ${error.message}`);
	}
}

export async function getSubscriptionById(
	id: string,
): Promise<SubscriptionSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("subscription")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get subscription: ${error.message}`);
	}

	return data;
}

export async function getSubscriptionsByOrganizationId(
	organizationId: string,
	options?: { limit?: number; offset?: number },
): Promise<SubscriptionSelect[]> {
	const adminClient = createAdminClient();

	let query = adminClient
		.from("subscription")
		.select("*")
		.eq("organization_id", organizationId)
		.order("created_at", { ascending: false });

	if (options?.limit) query = query.limit(options.limit);
	if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);

	const { data, error } = await query;

	if (error) {
		throw new Error(`Failed to get subscriptions: ${error.message}`);
	}

	return data ?? [];
}

export async function getActiveSubscriptionByOrganizationId(
	organizationId: string,
	db?: AdminClient,
): Promise<SubscriptionSelect | null> {
	const client = db ?? createAdminClient();
	const activeStatuses = ["active", "trialing", "past_due", "incomplete"] as const;

	const { data, error } = await client
		.from("subscription")
		.select("*")
		.eq("organization_id", organizationId)
		.in("status", activeStatuses)
		.order("created_at", { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get active subscription: ${error.message}`);
	}

	return data;
}

export async function getSubscriptionByStripeCustomerId(
	stripeCustomerId: string,
): Promise<SubscriptionSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("subscription")
		.select("*")
		.eq("stripe_customer_id", stripeCustomerId)
		.order("created_at", { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get subscription by customer: ${error.message}`);
	}

	return data;
}

export async function subscriptionExists(id: string): Promise<boolean> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("subscription")
		.select("id")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") return false;
		throw new Error(`Failed to check subscription existence: ${error.message}`);
	}

	return !!data;
}

// ============================================================================
// SUBSCRIPTION ITEM QUERIES
// ============================================================================

export type SubscriptionItemInsert = TablesInsert<"subscription_item">;
export type SubscriptionItemSelect = Tables<"subscription_item">;

export async function createSubscriptionItem(
	data: SubscriptionItemInsert,
): Promise<SubscriptionItemSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("subscription_item")
		.upsert(data, { onConflict: "id" })
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to create subscription item: ${error.message}`);
	}

	return result!;
}

export async function createSubscriptionItems(
	items: SubscriptionItemInsert[],
): Promise<SubscriptionItemSelect[]> {
	if (items.length === 0) return [];

	const adminClient = createAdminClient();

	const results: SubscriptionItemSelect[] = [];
	for (const item of items) {
		const { data, error } = await adminClient
			.from("subscription_item")
			.upsert(item, { onConflict: "id" })
			.select("*")
			.single();

		if (error) {
			throw new Error(`Failed to upsert subscription item: ${error.message}`);
		}
		results.push(data!);
	}

	return results;
}

export async function getSubscriptionItemsBySubscriptionId(
	subscriptionId: string,
): Promise<SubscriptionItemSelect[]> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("subscription_item")
		.select("*")
		.eq("subscription_id", subscriptionId);

	if (error) {
		throw new Error(`Failed to get subscription items: ${error.message}`);
	}

	return data ?? [];
}

export async function getSubscriptionItemById(
	id: string,
): Promise<SubscriptionItemSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("subscription_item")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get subscription item: ${error.message}`);
	}

	return data;
}

export async function updateSubscriptionItem(
	id: string,
	data: Partial<Omit<SubscriptionItemInsert, "id">>,
): Promise<SubscriptionItemSelect | null> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("subscription_item")
		.update(data)
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to update subscription item: ${error.message}`);
	}

	return result;
}

export async function deleteSubscriptionItem(id: string): Promise<void> {
	const adminClient = createAdminClient();

	const { error } = await adminClient
		.from("subscription_item")
		.delete()
		.eq("id", id);

	if (error) {
		throw new Error(`Failed to delete subscription item: ${error.message}`);
	}
}

export async function deleteSubscriptionItemsBySubscriptionId(
	subscriptionId: string,
): Promise<void> {
	const adminClient = createAdminClient();

	const { error } = await adminClient
		.from("subscription_item")
		.delete()
		.eq("subscription_id", subscriptionId);

	if (error) {
		throw new Error(`Failed to delete subscription items: ${error.message}`);
	}
}

export async function syncSubscriptionItems(
	subscriptionId: string,
	items: SubscriptionItemInsert[],
): Promise<SubscriptionItemSelect[]> {
	const adminClient = createAdminClient();

	// Delete existing items
	const { error: deleteError } = await adminClient
		.from("subscription_item")
		.delete()
		.eq("subscription_id", subscriptionId);

	if (deleteError) {
		throw new Error(`Failed to delete old subscription items: ${deleteError.message}`);
	}

	if (items.length === 0) return [];

	// Insert new items
	const created: SubscriptionItemSelect[] = [];
	for (const item of items) {
		const { data, error } = await adminClient
			.from("subscription_item")
			.insert(item)
			.select("*")
			.single();

		if (error) {
			throw new Error(`Failed to insert subscription item: ${error.message}`);
		}
		created.push(data!);
	}

	return created;
}

export function stripeItemsToDb(
	subscriptionId: string,
	items: Stripe.SubscriptionItem[],
): SubscriptionItemInsert[] {
	return items.map((item) => {
		const price = item.price;
		const recurring = price.recurring;

		let priceModel: "flat" | "per_seat" | "metered" = "flat";
		const priceConfig = getPriceByStripePriceId(price.id);
		if (
			priceConfig &&
			"seatBased" in priceConfig.price &&
			priceConfig.price.seatBased
		) {
			priceModel = "per_seat";
		} else if (recurring?.usage_type === "metered") {
			priceModel = "metered";
		}

		return {
			id: item.id,
			subscription_id: subscriptionId,
			stripe_price_id: price.id,
			stripe_product_id:
				typeof price.product === "string" ? price.product : undefined,
			quantity: item.quantity ?? 1,
			price_amount: price.unit_amount ?? undefined,
			price_type: recurring ? "recurring" as const : "one_time" as const,
			price_model: priceModel,
			interval: recurring?.interval as SubscriptionItemInsert["interval"],
			interval_count: recurring?.interval_count ?? 1,
			meter_id: recurring?.meter ?? undefined,
		};
	});
}

// ============================================================================
// ORDER QUERIES (One-time orders)
// ============================================================================

export type OrderInsert = TablesInsert<"order">;
export type OrderSelect = Tables<"order">;

export async function createOrder(data: OrderInsert): Promise<OrderSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("order")
		.insert(data)
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to create order: ${error.message}`);
	}

	return result!;
}

export async function getOrderById(id: string): Promise<OrderSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get order: ${error.message}`);
	}

	return data;
}

export async function getOrdersByOrganizationId(
	organizationId: string,
	options?: { limit?: number; offset?: number },
): Promise<OrderSelect[]> {
	const adminClient = createAdminClient();

	let query = adminClient
		.from("order")
		.select("*")
		.eq("organization_id", organizationId)
		.order("created_at", { ascending: false });

	if (options?.limit) query = query.limit(options.limit);
	if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);

	const { data, error } = await query;

	if (error) {
		throw new Error(`Failed to get orders: ${error.message}`);
	}

	return data ?? [];
}

export async function getOrderByCheckoutSessionId(
	checkoutSessionId: string,
): Promise<OrderSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order")
		.select("*")
		.eq("stripe_checkout_session_id", checkoutSessionId)
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get order by checkout session: ${error.message}`);
	}

	return data;
}

export async function getOrderByPaymentIntentId(
	paymentIntentId: string,
): Promise<OrderSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order")
		.select("*")
		.eq("stripe_payment_intent_id", paymentIntentId)
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get order by payment intent: ${error.message}`);
	}

	return data;
}

export async function updateOrder(
	id: string,
	data: Partial<Omit<OrderInsert, "id">>,
): Promise<OrderSelect | null> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("order")
		.update(data)
		.eq("id", id)
		.select("*")
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to update order: ${error.message}`);
	}

	return result;
}

export interface LifetimeOrderResult {
	order: OrderSelect;
	stripePriceId: string;
}

export async function getLifetimeOrderByOrganizationId(
	organizationId: string,
): Promise<LifetimeOrderResult | null> {
	const adminClient = createAdminClient();

	// Get completed orders with their items
	const { data: orders, error: orderError } = await adminClient
		.from("order")
		.select("*")
		.eq("organization_id", organizationId)
		.eq("status", "completed")
		.order("created_at", { ascending: false })
		.limit(10);

	if (orderError || !orders || orders.length === 0) return null;

	// Get items for these orders
	const orderIds = orders.map((o) => o.id);
	const { data: items, error: itemsError } = await adminClient
		.from("order_item")
		.select("*")
		.in("order_id", orderIds);

	if (itemsError || !items) return null;

	// Check for lifetime plan
	for (const order of orders) {
		const orderItems = items.filter((i) => i.order_id === order.id);
		for (const item of orderItems) {
			const plan = getPlanByStripePriceId(item.stripe_price_id);
			if (plan?.id === "lifetime") {
				return {
					order,
					stripePriceId: item.stripe_price_id,
				};
			}
		}
	}

	return null;
}

// ============================================================================
// ORDER ITEM QUERIES
// ============================================================================

export type OrderItemInsert = TablesInsert<"order_item">;
export type OrderItemSelect = Tables<"order_item">;

export async function createOrderItem(
	data: OrderItemInsert,
): Promise<OrderItemSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("order_item")
		.insert(data)
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to create order item: ${error.message}`);
	}

	return result!;
}

export async function createOrderItems(
	items: OrderItemInsert[],
): Promise<OrderItemSelect[]> {
	if (items.length === 0) return [];

	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order_item")
		.insert(items)
		.select("*");

	if (error) {
		throw new Error(`Failed to create order items: ${error.message}`);
	}

	return data ?? [];
}

export async function getOrderItemsByOrderId(
	orderId: string,
): Promise<OrderItemSelect[]> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order_item")
		.select("*")
		.eq("order_id", orderId);

	if (error) {
		throw new Error(`Failed to get order items: ${error.message}`);
	}

	return data ?? [];
}

export async function getOrderItemById(
	id: string,
): Promise<OrderItemSelect | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("order_item")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get order item: ${error.message}`);
	}

	return data;
}

export async function deleteOrderItemsByOrderId(
	orderId: string,
): Promise<void> {
	const adminClient = createAdminClient();

	const { error } = await adminClient
		.from("order_item")
		.delete()
		.eq("order_id", orderId);

	if (error) {
		throw new Error(`Failed to delete order items: ${error.message}`);
	}
}

// ============================================================================
// BILLING EVENT QUERIES (Audit log)
// ============================================================================

export type BillingEventInsert = TablesInsert<"billing_event">;
export type BillingEventSelect = Tables<"billing_event">;

export async function createBillingEvent(
	data: BillingEventInsert,
): Promise<BillingEventSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("billing_event")
		.insert(data)
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to create billing event: ${error.message}`);
	}

	return result!;
}

export async function billingEventExists(
	stripeEventId: string,
): Promise<boolean> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("billing_event")
		.select("id")
		.eq("stripe_event_id", stripeEventId)
		.single();

	if (error) {
		if (error.code === "PGRST116") return false;
		throw new Error(`Failed to check billing event existence: ${error.message}`);
	}

	return !!data;
}

export async function getBillingEventsByOrganizationId(
	organizationId: string,
	options?: { limit?: number },
): Promise<BillingEventSelect[]> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("billing_event")
		.select("*")
		.eq("organization_id", organizationId)
		.order("created_at", { ascending: false })
		.limit(options?.limit ?? 50);

	if (error) {
		throw new Error(`Failed to get billing events: ${error.message}`);
	}

	return data ?? [];
}

export async function markBillingEventError(
	id: string,
	error: string,
): Promise<void> {
	const adminClient = createAdminClient();

	const { error: updateError } = await adminClient
		.from("billing_event")
		.update({ processed: false, error })
		.eq("id", id);

	if (updateError) {
		throw new Error(`Failed to mark billing event error: ${updateError.message}`);
	}
}

export async function upsertBillingEvent(
	data: BillingEventInsert,
): Promise<BillingEventSelect> {
	const adminClient = createAdminClient();

	const { data: result, error } = await adminClient
		.from("billing_event")
		.upsert(data, { onConflict: "stripe_event_id" })
		.select("*")
		.single();

	if (error) {
		throw new Error(`Failed to upsert billing event: ${error.message}`);
	}

	return result!;
}

// ============================================================================
// ACTIVE PLAN HELPER
// ============================================================================

export async function getActivePlanForOrganization(
	organizationId: string,
): Promise<ActivePlanInfo | null> {
	const subscription =
		await getActiveSubscriptionByOrganizationId(organizationId);

	if (subscription) {
		const plan = getPlanByStripePriceId(subscription.stripe_price_id);

		return {
			planId: plan?.id ?? "unknown",
			planName: plan?.name ?? "Unknown Plan",
			stripePriceId: subscription.stripe_price_id,
			status: subscription.status,
			isTrialing: subscription.status === "trialing",
			trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end) : null,
			currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			quantity: subscription.quantity,
			isLifetime: false,
		};
	}

	const lifetimeResult = await getLifetimeOrderByOrganizationId(organizationId);
	if (lifetimeResult) {
		const plan = getPlanByStripePriceId(lifetimeResult.stripePriceId);
		return {
			planId: plan?.id ?? "lifetime",
			planName: plan?.name ?? "Lifetime",
			stripePriceId: lifetimeResult.stripePriceId,
			status: "active",
			isTrialing: false,
			trialEndsAt: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
			quantity: 1,
			isLifetime: true,
		};
	}

	return null;
}

export async function hasActivePaidPlan(
	organizationId: string,
): Promise<boolean> {
	return (await getActivePlanForOrganization(organizationId)) !== null;
}

export async function hasSpecificPlan(
	organizationId: string,
	planId: string,
): Promise<boolean> {
	const activePlan = await getActivePlanForOrganization(organizationId);
	return activePlan?.planId === planId;
}

// ============================================================================
// STRIPE SYNC HELPERS
// ============================================================================

export function safeTsToDate(ts: number | null | undefined): Date | null {
	if (ts === null || ts === undefined || ts === 0) return null;
	const date = new Date(ts * 1000);
	if (Number.isNaN(date.getTime())) return null;
	return date;
}

export function stripeSubscriptionToDb(
	stripeSubscription: Stripe.Subscription,
	organizationId: string,
): SubscriptionInsert {
	const item = stripeSubscription.items?.data?.[0];
	const price = item?.price;
	const recurring = price?.recurring;

	const quantity = Math.max(1, item?.quantity ?? 1);

	const currentPeriodStartTs =
		item?.current_period_start ??
		stripeSubscription.start_date ??
		stripeSubscription.created ??
		Math.floor(Date.now() / 1000);

	const currentPeriodEndTs =
		item?.current_period_end ??
		stripeSubscription.billing_cycle_anchor ??
		Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

	return {
		id: stripeSubscription.id,
		organization_id: organizationId,
		stripe_customer_id:
			typeof stripeSubscription.customer === "string"
				? stripeSubscription.customer
				: stripeSubscription.customer?.id,
		status: (stripeSubscription.status ?? "active") as SubscriptionInsert["status"],
		stripe_price_id: price?.id ?? "",
		stripe_product_id:
			typeof price?.product === "string" ? price.product : undefined,
		quantity,
		interval: (recurring?.interval ?? "month") as SubscriptionInsert["interval"],
		interval_count: recurring?.interval_count ?? 1,
		unit_amount: price?.unit_amount ?? null,
		currency: stripeSubscription.currency ?? "usd",
		current_period_start: (safeTsToDate(currentPeriodStartTs) ?? new Date()).toISOString(),
		current_period_end: (safeTsToDate(currentPeriodEndTs) ?? new Date()).toISOString(),
		trial_start: safeTsToDate(stripeSubscription.trial_start)?.toISOString() ?? null,
		trial_end: safeTsToDate(stripeSubscription.trial_end)?.toISOString() ?? null,
		cancel_at_period_end: !!stripeSubscription.cancel_at_period_end,
		canceled_at: safeTsToDate(stripeSubscription.canceled_at)?.toISOString() ?? null,
	};
}

/**
 * Get organization by Stripe customer ID
 * Re-exported here since webhook route.ts and other billing code imports from this module
 */
export async function getOrganizationByStripeCustomerId(
	stripeCustomerId: string,
): Promise<{ id: string; name: string; slug: string | null } | null> {
	const adminClient = createAdminClient();

	const { data, error } = await adminClient
		.from("organization")
		.select("id, name, slug")
		.eq("stripe_customer_id", stripeCustomerId)
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") return null;
		throw new Error(`Failed to get organization by customer ID: ${error.message}`);
	}

	return data;
}

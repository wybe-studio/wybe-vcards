import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./stripe";

/**
 * Create or retrieve a Stripe customer for an organization.
 * If the organization already has a stripeCustomerId, return that customer.
 * Otherwise, create a new customer and save the ID to the organization.
 *
 * Uses atomic database operations to prevent race conditions where
 * concurrent requests could create duplicate Stripe customers.
 */
export async function getOrCreateStripeCustomer(params: {
	organizationId: string;
	organizationName: string;
	email?: string;
}): Promise<Stripe.Customer> {
	const { organizationId, organizationName, email } = params;
	const stripe = getStripe();
	const adminClient = createAdminClient();

	// First, check if org already has a Stripe customer
	const { data: organization } = await adminClient
		.from("organization")
		.select("stripe_customer_id")
		.eq("id", organizationId)
		.single();

	if (organization?.stripe_customer_id) {
		// Retrieve existing customer
		const customer = await stripe.customers.retrieve(
			organization.stripe_customer_id,
		);

		// If customer was deleted, create a new one
		if ((customer as Stripe.DeletedCustomer).deleted) {
			return createAndSaveCustomerAtomically({
				organizationId,
				organizationName,
				email,
			});
		}

		return customer as Stripe.Customer;
	}

	// Create new customer atomically
	return createAndSaveCustomerAtomically({
		organizationId,
		organizationName,
		email,
	});
}

/**
 * Create a new Stripe customer and save the ID to the organization atomically.
 * Uses conditional update to prevent race conditions - only updates if
 * stripeCustomerId is still null, preventing duplicate customer creation.
 */
async function createAndSaveCustomerAtomically(params: {
	organizationId: string;
	organizationName: string;
	email?: string;
}): Promise<Stripe.Customer> {
	const { organizationId, organizationName, email } = params;
	const stripe = getStripe();
	const adminClient = createAdminClient();

	// Create customer in Stripe first with idempotency key to prevent duplicates
	// Uses organizationId as key since each org should have exactly one customer
	const customer = await stripe.customers.create(
		{
			name: organizationName,
			email,
			metadata: {
				organizationId,
			},
		},
		{
			idempotencyKey: `customer-create-${organizationId}`,
		},
	);

	// Atomically update organization only if stripeCustomerId is still null
	// This prevents race conditions where two concurrent requests could
	// both create Stripe customers
	const { data, count } = await adminClient
		.from("organization")
		.update({ stripe_customer_id: customer.id })
		.eq("id", organizationId)
		.is("stripe_customer_id", null)
		.select();

	// If we didn't update (another request won the race), fetch the existing customer
	if (!data || data.length === 0) {
		// Another concurrent request already set a customer ID
		const { data: org } = await adminClient
			.from("organization")
			.select("stripe_customer_id")
			.eq("id", organizationId)
			.single();

		if (org?.stripe_customer_id) {
			// Delete the orphaned customer we just created
			await stripe.customers.del(customer.id);

			// Return the customer that won the race
			const existingCustomer = await stripe.customers.retrieve(
				org.stripe_customer_id,
			);
			return existingCustomer as Stripe.Customer;
		}
	}

	return customer;
}

/**
 * Get Stripe customer by organization ID
 */
export async function getStripeCustomerByOrganizationId(
	organizationId: string,
): Promise<Stripe.Customer | null> {
	const adminClient = createAdminClient();

	const { data: organization } = await adminClient
		.from("organization")
		.select("stripe_customer_id")
		.eq("id", organizationId)
		.single();

	if (!organization?.stripe_customer_id) {
		return null;
	}

	const stripe = getStripe();
	const customer = await stripe.customers.retrieve(
		organization.stripe_customer_id,
	);

	if ((customer as Stripe.DeletedCustomer).deleted) {
		return null;
	}

	return customer as Stripe.Customer;
}

/**
 * Update Stripe customer details
 */
export async function updateStripeCustomer(
	customerId: string,
	data: Stripe.CustomerUpdateParams,
): Promise<Stripe.Customer> {
	const stripe = getStripe();
	return stripe.customers.update(customerId, data);
}

/**
 * Get organization by Stripe customer ID
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
		return null;
	}

	return data;
}

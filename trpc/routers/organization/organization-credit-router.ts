import { TRPCError } from "@trpc/server";
import { appConfig } from "@/config/app.config";
import { creditPackages } from "@/config/billing.config";
import {
	createCheckoutSession,
	getOrCreateStripeCustomer,
} from "@/lib/billing";
import {
	getCreditBalance,
	listCreditTransactions,
} from "@/lib/billing/credits";
import {
	getOrganizationCreditTransactionsSchema,
	purchaseOrganizationCreditSchema,
} from "@/schemas/organization-credit-schemas";
import {
	createTRPCRouter,
	featureGuard,
	protectedOrganizationProcedure,
} from "@/trpc/init";

export const organizationCreditRouter = createTRPCRouter({
	getBalance: protectedOrganizationProcedure
		.use(featureGuard("billing"))
		.query(async ({ ctx }) => {
			const balance = await getCreditBalance(ctx.organization.id);

			return {
				balance: balance.balance,
				lifetimePurchased: balance.lifetime_purchased,
				lifetimeGranted: balance.lifetime_granted,
				lifetimeUsed: balance.lifetime_used,
			};
		}),

	getTransactions: protectedOrganizationProcedure
		.use(featureGuard("billing"))
		.input(getOrganizationCreditTransactionsSchema)
		.query(async ({ ctx, input }) => {
			const { count, error: countError } = await ctx.supabase
				.from("credit_transaction")
				.select("*", { count: "exact", head: true })
				.eq("organization_id", ctx.organization.id);

			if (countError) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Impossibile contare le transazioni",
				});
			}

			const total = count ?? 0;

			const transactions = await listCreditTransactions(ctx.organization.id, {
				limit: input.limit,
				offset: input.offset,
			});

			return {
				transactions: transactions.map((tx) => ({
					id: tx.id,
					type: tx.type,
					amount: tx.amount,
					balanceAfter: tx.balance_after,
					description: tx.description,
					model: tx.model,
					createdAt: tx.created_at,
				})),
				total,
				hasMore: (input.offset ?? 0) + transactions.length < total,
			};
		}),

	getPackages: protectedOrganizationProcedure
		.use(featureGuard("billing"))
		.query(async () => {
			return creditPackages.map((pkg) => ({
				id: pkg.id,
				name: pkg.name,
				description: pkg.description,
				credits: pkg.credits,
				bonusCredits: pkg.bonusCredits,
				totalCredits: pkg.credits + pkg.bonusCredits,
				priceAmount: pkg.priceAmount,
				currency: pkg.currency,
				popular: pkg.popular,
			}));
		}),

	purchaseCredits: protectedOrganizationProcedure
		.use(featureGuard("billing"))
		.input(purchaseOrganizationCreditSchema)
		.mutation(async ({ ctx, input }) => {
			const { organization, user, membership } = ctx;

			// Only admins can purchase
			if (membership.role !== "owner" && membership.role !== "admin") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Solo gli admin dell'organizzazione possono acquistare crediti",
				});
			}

			// Validate package
			const pkg = creditPackages.find((p) => p.id === input.packageId);
			if (!pkg) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Pacchetto crediti non valido",
				});
			}

			// Check if Stripe price ID is configured
			if (!pkg.stripePriceId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Pacchetto crediti non configurato per l'acquisto",
				});
			}

			// Get or create Stripe customer
			const customer = await getOrCreateStripeCustomer({
				organizationId: organization.id,
				organizationName: organization.name,
				email: user.email,
			});

			// Create checkout session
			const baseUrl = appConfig.baseUrl;
			const { url } = await createCheckoutSession({
				organizationId: organization.id,
				stripePriceId: pkg.stripePriceId,
				stripeCustomerId: customer.id,
				quantity: 1,
				successUrl: `${baseUrl}/dashboard/organization/settings?tab=credits&success=true`,
				cancelUrl: `${baseUrl}/dashboard/organization/settings?tab=credits&canceled=true`,
				metadata: {
					type: "credit_purchase",
					packageId: pkg.id,
					organizationId: organization.id,
					userId: user.id,
				},
			});

			return { url };
		}),
});

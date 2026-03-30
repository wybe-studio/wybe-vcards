import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
	/**
	 * Server-side environment variables schema.
	 * These are only available on the server.
	 */
	server: {
		// Node
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		// Auth
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),

		// Supabase
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

		// Email
		EMAIL_FROM: z.string().optional(),
		RESEND_API_KEY: z.string().optional(),

		// Monitoring / Sentry
		SENTRY_ORG: z.string().optional(),
		SENTRY_PROJECT: z.string().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),

		// Stripe / Billing
		STRIPE_SECRET_KEY: z.string().optional(),
		STRIPE_WEBHOOK_SECRET: z.string().optional(),

		// Cloudflare Turnstile (Captcha)
		TURNSTILE_SECRET_KEY: z.string().optional(),

		// Build / CI
		ANALYZE: z
			.string()
			.default("false")
			.transform((val) => val === "true"),
		CI: z.string().optional(),
		VERCEL: z.string().optional(),
		VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
	},

	/**
	 * Client-side environment variables schema.
	 * These must be prefixed with `NEXT_PUBLIC_` to be exposed to the client.
	 */
	client: {
		NEXT_PUBLIC_NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		NEXT_PUBLIC_LOG_LEVEL: z
			.enum(["trace", "debug", "info", "warn", "error", "fatal"])
			.default("info"),
		NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
		NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
		NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

		// Stripe / Billing (public)
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

		// Cloudflare Turnstile (Captcha)
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
		// Stripe Price IDs for each plan
		NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
		NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
		NEXT_PUBLIC_STRIPE_PRICE_LIFETIME: z.string().optional(),

		// Stripe Price IDs for credit packages
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_STARTER: z.string().optional(),
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_BASIC: z.string().optional(),
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_PRO: z.string().optional(),

		// Vercel-provided
		NEXT_PUBLIC_VERCEL_ENV: z
			.enum(["development", "preview", "production"])
			.optional(),
		NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
		NEXT_PUBLIC_VERCEL_BRANCH_URL: z.string().optional(),
		NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: z.string().optional(),
		NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

		// Feature Flags
		NEXT_PUBLIC_FEATURE_BILLING: z.string().optional(),
		NEXT_PUBLIC_FEATURE_LEADS: z.string().optional(),
		NEXT_PUBLIC_FEATURE_AI_CHATBOT: z.string().optional(),
		NEXT_PUBLIC_FEATURE_ONBOARDING: z.string().optional(),
		NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION: z.string().optional(),
		NEXT_PUBLIC_FEATURE_MULTI_ORG: z.string().optional(),
		NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY: z.string().optional(),
		NEXT_PUBLIC_FEATURE_GOOGLE_AUTH: z.string().optional(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes
	 * (e.g. middlewares) or client-side, so we need to destruct manually.
	 */
	runtimeEnv: {
		// Server
		NODE_ENV: process.env.NODE_ENV,
		GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		EMAIL_FROM: process.env.EMAIL_FROM,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
		ANALYZE: process.env.ANALYZE,
		CI: process.env.CI,
		VERCEL: process.env.VERCEL,
		VERCEL_ENV: process.env.VERCEL_ENV,

		// Client
		NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
		NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
		NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
		NEXT_PUBLIC_STRIPE_PRICE_LIFETIME:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_LIFETIME,
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_STARTER:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_STARTER,
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_BASIC:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_BASIC,
		NEXT_PUBLIC_STRIPE_PRICE_CREDITS_PRO:
			process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_PRO,
		NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
		NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
		NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
		NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF:
			process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
		NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
			process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,

		// Feature Flags
		NEXT_PUBLIC_FEATURE_BILLING: process.env.NEXT_PUBLIC_FEATURE_BILLING,
		NEXT_PUBLIC_FEATURE_LEADS: process.env.NEXT_PUBLIC_FEATURE_LEADS,
		NEXT_PUBLIC_FEATURE_AI_CHATBOT: process.env.NEXT_PUBLIC_FEATURE_AI_CHATBOT,
		NEXT_PUBLIC_FEATURE_ONBOARDING: process.env.NEXT_PUBLIC_FEATURE_ONBOARDING,
		NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION:
			process.env.NEXT_PUBLIC_FEATURE_PUBLIC_REGISTRATION,
		NEXT_PUBLIC_FEATURE_MULTI_ORG: process.env.NEXT_PUBLIC_FEATURE_MULTI_ORG,
		NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY:
			process.env.NEXT_PUBLIC_FEATURE_PERSONAL_ACCOUNT_ONLY,
		NEXT_PUBLIC_FEATURE_GOOGLE_AUTH:
			process.env.NEXT_PUBLIC_FEATURE_GOOGLE_AUTH,
	},

	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
	 * This is useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,

	/**
	 * Makes it so that empty strings are treated as undefined.
	 * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});

import * as Sentry from "@sentry/nextjs";
import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod/v4";
import { type FeaturesConfig, featuresConfig } from "@/config/features.config";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import type { Context } from "@/trpc/context";

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter: ({ shape, error }) => {
		if (error.code === "INTERNAL_SERVER_ERROR") {
			return {
				...shape,
				message:
					env.NODE_ENV === "development"
						? error.message
						: "Si è verificato un errore",
				cause: env.NODE_ENV === "development" ? error.cause : undefined,
			};
		}
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const sentryMiddleware = t.middleware(
	Sentry.trpcMiddleware({ attachRpcInput: true }),
);

/**
 * Logging middleware that captures procedure calls with user and organization context
 * Sets up Sentry context for better error reporting
 */
const loggingMiddleware = t.middleware(
	async ({ ctx, next, path, type, input }) => {
		const startTime = Date.now();

		// Extract user info from context if available
		const userId = (ctx as { user?: { id?: string } }).user?.id;
		const userEmail = (ctx as { user?: { email?: string } }).user?.email;
		const userRole = (ctx as { user?: { role?: string } }).user?.role;

		// Extract organizationId from input if available
		const organizationId = (input as { organizationId?: string })
			?.organizationId;

		// Set Sentry context for better error reporting
		const scope = Sentry.getCurrentScope();

		// Set user context
		if (userId) {
			scope.setUser({
				id: userId,
				email: userEmail,
			});
		}

		// Set additional context
		scope.setContext("trpc", {
			procedure: path,
			type,
			organizationId,
			userRole,
			requestId: ctx.requestId,
		});

		// Set tags for filtering in Sentry
		if (organizationId) {
			scope.setTag("organizationId", organizationId);
		}
		if (userRole) {
			scope.setTag("userRole", userRole);
		}
		scope.setTag("procedure", path);
		scope.setTag("procedureType", type);

		try {
			const result = await next();
			return result;
		} catch (error) {
			const duration = Date.now() - startTime;

			// Log procedure error with additional data
			logger.error(
				{
					procedure: path,
					type,
					duration,
					success: false,
					error: getErrorMessage(error),
					errorCode: error instanceof TRPCError ? error.code : undefined,
					userId,
					userEmail,
					organizationId,
					requestId: ctx.requestId,
					userAgent: ctx.userAgent,
					ip: ctx.ip,
				},
				"tRPC procedure failed",
			);

			throw error;
		}
	},
);

/**
 * Feature flag guard middleware.
 * Blocks procedure execution with FORBIDDEN when the specified feature is disabled.
 */
export const featureGuard = (feature: keyof FeaturesConfig) =>
	t.middleware(({ next }) => {
		if (!featuresConfig[feature]) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Funzionalità "${feature}" non abilitata.`,
			});
		}
		return next();
	});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure
	.use(loggingMiddleware)
	.use(sentryMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.user` is not null.
 *
 * Also provides ctx.supabase for RLS-aware database queries.
 */
export const protectedProcedure = t.procedure
	.use(async ({ ctx, next }) => {
		const supabase = await createClient();
		const { data, error } = await supabase.auth.getClaims();

		if (!data?.claims) {
			logger.error("No valid session.");
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Sessione non valida.",
			});
		}

		const claims = data.claims;

		const { data: profile } = await supabase
			.from("user_profile")
			.select("*")
			.eq("id", claims.sub)
			.single();

		return next({
			ctx: {
				...ctx,
				supabase,
				user: {
					id: claims.sub,
					email: claims.email ?? "",
					role: profile?.role ?? "user",
					name: claims.user_metadata?.name ?? claims.user_metadata?.full_name,
					image: claims.user_metadata?.avatar_url,
				},
				claims,
				profile,
			},
		});
	})
	.use(loggingMiddleware)
	.use(sentryMiddleware);

/**
 * Protected (authenticated) admin procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged admins. It verifies
 * the user role is admin.
 *
 */
export const protectedAdminProcedure = protectedProcedure.use(
	({ ctx, next }) => {
		if (ctx.profile?.role !== "admin") {
			throw new TRPCError({ code: "FORBIDDEN", message: "Accesso negato" });
		}

		return next({ ctx });
	},
);

/**
 * Protected organization procedure
 *
 * For procedures that require an active organization. It verifies:
 * 1. User is authenticated
 * 2. There is an active organization in the cookie
 * 3. User is a member of the active organization
 *
 * Provides ctx.organization with the validated organization and membership.
 */
export const protectedOrganizationProcedure = protectedProcedure.use(
	async ({ ctx, next }) => {
		const cookieStore = await cookies();
		const activeOrgId = cookieStore.get("active-organization-id")?.value;

		if (!activeOrgId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Nessuna organizzazione attiva. Seleziona prima un'organizzazione.",
			});
		}

		// Verify user is a member of the organization and get organization details
		const { data: member } = await ctx.supabase
			.from("member")
			.select("*, organization:organization(*)")
			.eq("organization_id", activeOrgId)
			.eq("user_id", ctx.user.id)
			.single();

		if (!member || !member.organization) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Non sei membro di questa organizzazione",
			});
		}

		return next({
			ctx: {
				...ctx,
				organization: member.organization,
				membership: { role: member.role, id: member.id },
			},
		});
	},
);

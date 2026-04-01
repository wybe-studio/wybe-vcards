import { type NextRequest, NextResponse } from "next/server";
import { withQuery } from "ufo";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { featuresConfig } from "./config/features.config";
import { updateSession } from "./lib/supabase/proxy";

function getCorsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get("origin") || "*";

	const isAllowed =
		origin === "*" ||
		authConfig.cors.allowedOrigins.some((allowedOrigin) =>
			allowedOrigin instanceof RegExp
				? allowedOrigin.test(origin)
				: allowedOrigin === origin,
		);

	if (isAllowed) {
		const headers: Record<string, string> = {
			"Access-Control-Allow-Methods": authConfig.cors.allowedMethods.join(", "),
			"Access-Control-Allow-Headers": authConfig.cors.allowedHeaders.join(", "),
			"Access-Control-Max-Age": authConfig.cors.maxAge.toString(),
			"Access-Control-Allow-Origin": origin,
		};

		if (origin !== "*") {
			headers["Access-Control-Allow-Credentials"] = "true";
		}

		return headers;
	}

	if (process.env.NODE_ENV === "development") {
		console.warn("CORS origin not allowed", { origin });
	}

	return {};
}

function isProtectedPath(pathname: string): boolean {
	return pathname.startsWith("/dashboard");
}

function canBypassOnboarding(pathname: string): boolean {
	return (
		pathname === "/dashboard/onboarding" ||
		pathname.startsWith("/dashboard/choose-plan") ||
		pathname.startsWith("/dashboard/organization-invitation") ||
		pathname.startsWith("/dashboard/account/setup-2fa")
	);
}

export default async function proxy(req: NextRequest) {
	const { pathname, origin, searchParams } = req.nextUrl;

	// CWE-200: Prevent sensitive data exposure in URLs
	// Check auth paths for sensitive parameters and return 400 to prevent logging
	if (pathname.startsWith("/auth")) {
		const hasSensitiveParam = ["password", "apiKey"].some((p) =>
			searchParams.has(p),
		);
		if (hasSensitiveParam) {
			return new NextResponse(
				"Bad Request: Sensitive data should not be passed in URL parameters",
				{ status: 400 },
			);
		}
	}

	// CWE-204: Block TRACE and TRACK methods to prevent proxy/server fingerprinting
	if (req.method === "TRACE" || req.method === "TRACK") {
		return new NextResponse(null, {
			status: 405,
			headers: {
				Allow: "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
				"Content-Type": "text/plain",
			},
		});
	}

	// Handle CORS for API routes
	if (pathname.startsWith("/api") || pathname.startsWith("/storage")) {
		const corsHeaders = getCorsHeaders(req);
		if (req.method === "OPTIONS") {
			return new NextResponse(null, {
				status: 200,
				headers: corsHeaders,
			});
		}
		const response = NextResponse.next();
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
		return response;
	}

	// If SaaS is disabled, redirect dashboard/auth routes to marketing
	if (!appConfig.site.saas.enabled) {
		if (pathname.startsWith("/dashboard") || pathname.startsWith("/auth")) {
			return NextResponse.redirect(new URL("/", origin));
		}
	}

	// If marketing is disabled, redirect to dashboard
	// Skip API routes and special paths
	if (!appConfig.site.marketing.enabled) {
		const isMarketingPath =
			!pathname.startsWith("/dashboard") &&
			!pathname.startsWith("/auth") &&
			!pathname.startsWith("/api") &&
			!pathname.startsWith("/storage");

		if (isMarketingPath) {
			return NextResponse.redirect(new URL("/dashboard", origin));
		}
	}

	// Feature flag: redirect billing routes when billing is disabled
	if (!featuresConfig.billing) {
		if (
			pathname.startsWith("/dashboard/choose-plan") ||
			pathname === "/pricing"
		) {
			return NextResponse.redirect(new URL("/dashboard", origin));
		}
	}

	// Feature flag: redirect chatbot routes when AI chatbot is disabled
	if (!featuresConfig.aiChatbot) {
		if (pathname.startsWith("/dashboard/organization/chatbot")) {
			return NextResponse.redirect(new URL("/dashboard", origin));
		}
	}

	// Feature flag: redirect leads routes when leads feature is disabled
	if (!featuresConfig.leads) {
		if (pathname.startsWith("/dashboard/organization/leads")) {
			return NextResponse.redirect(new URL("/dashboard", origin));
		}
	}

	// Feature flag: block public signup when registration is disabled
	if (!featuresConfig.publicRegistration) {
		if (pathname === "/auth/sign-up") {
			const hasInvitation = searchParams.has("invitationId");
			if (!hasInvitation) {
				return NextResponse.redirect(new URL("/auth/sign-in", origin));
			}
		}
	}

	// Protected routes that require authentication
	if (isProtectedPath(pathname)) {
		const { supabase, user, response } = await updateSession(req);

		if (!user) {
			// Invitation pages → redirect to sign-up with invitationId
			const invitationMatch = pathname.match(
				/^\/dashboard\/organization-invitation\/([^/]+)$/,
			);
			if (invitationMatch) {
				return NextResponse.redirect(
					new URL(
						withQuery("/auth/sign-up", {
							invitationId: invitationMatch[1],
							redirectTo: pathname,
						}),
						origin,
					),
				);
			}

			return NextResponse.redirect(
				new URL(
					withQuery("/auth/sign-in", {
						redirectTo: pathname,
					}),
					origin,
				),
			);
		}

		// Query user profile for ban and onboarding status
		const { data: profile } = await supabase
			.from("user_profile")
			.select("banned, ban_expires, onboarding_complete, role")
			.eq("id", user.sub)
			.single();

		// Check if user is banned (but not if already on banned page)
		if (profile?.banned && pathname !== "/auth/banned") {
			// Check if ban has expired
			const banExpired =
				profile.ban_expires && new Date(profile.ban_expires) < new Date();

			if (!banExpired) {
				// Ban is still active, redirect to banned page
				return NextResponse.redirect(new URL("/auth/banned", origin));
			}
			// If ban has expired, allow the request to continue
			// The ban status will be updated on the next auth check
		}

		// Check onboarding status (with exceptions for certain paths)
		if (
			featuresConfig.onboarding &&
			!profile?.onboarding_complete &&
			!canBypassOnboarding(pathname)
		) {
			return NextResponse.redirect(
				new URL(
					withQuery("/dashboard/onboarding", {
						redirectTo: pathname,
					}),
					origin,
				),
			);
		}

		// Enforce 2FA for platform admins accessing admin routes
		if (pathname.startsWith("/dashboard/admin")) {
			if (profile?.role === "admin") {
				const { data: factors } = await supabase.auth.mfa.listFactors();
				const hasVerifiedFactor = factors?.totp?.some(
					(f: { status: string }) => f.status === "verified",
				);

				if (!hasVerifiedFactor) {
					return NextResponse.redirect(
						new URL("/dashboard/account/setup-2fa", origin),
					);
				}

				// Check AAL level from JWT claims
				const aal = user.aal ?? "aal1";
				if (aal !== "aal2") {
					return NextResponse.redirect(
						new URL(
							withQuery("/auth/verify", {
								redirectTo: pathname,
							}),
							origin,
						),
					);
				}
			}
		}

		return response;
	}

	// Handle auth routes - redirect logged-in users away
	if (pathname.startsWith("/auth")) {
		const { user, response } = await updateSession(req);

		// Allow confirm, callback, reset-password, verify and banned pages even when logged in
		if (
			user &&
			pathname !== "/auth/banned" &&
			pathname !== "/auth/callback" &&
			pathname !== "/auth/confirm" &&
			pathname !== "/auth/reset-password" &&
			pathname !== "/auth/verify"
		) {
			// If user is logged in and has an invitation, redirect to invitation page
			const invitationId = req.nextUrl.searchParams.get("invitationId");
			if (invitationId) {
				return NextResponse.redirect(
					new URL(`/dashboard/organization-invitation/${invitationId}`, origin),
				);
			}
			return NextResponse.redirect(new URL("/dashboard", origin));
		}

		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!monitoring|monitoring-tunnel|marketing/avatars|marketing/logos|marketing/placeholders|images|fonts|assets|.well-known|favicon.svg|apple-touch-icon.png|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};

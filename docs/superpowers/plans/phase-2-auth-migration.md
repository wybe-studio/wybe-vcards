# Phase 2: Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Better Auth with Supabase Auth across the entire auth stack - middleware, server helpers, client hooks, tRPC procedures, auth pages, and OAuth/email callback routes.
**Depends on:** Phase 1
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md` Section 4, 8

---

## Task 10: Rewrite Root `proxy.ts` (Next.js 16 Middleware)

> For agentic workers: the root `proxy.ts` is the Next.js 16 middleware entry point. Replace the Better Auth session fetch (`betterFetch` to `/api/auth/get-session`) with Supabase session refresh via `updateSession()` from `lib/supabase/proxy.ts` (created in Phase 1). Keep all existing security checks (CORS, TRACE/TRACK blocking, sensitive URL params, SaaS/marketing toggles).

### Current behavior (Better Auth)

The current `proxy.ts` calls `betterFetch("/api/auth/get-session")` which makes a network request to the Better Auth API on every middleware invocation. This is replaced by `supabase.auth.getClaims()` which does local JWT verification with no network call.

### New `proxy.ts`

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { withQuery } from "ufo";
import { appConfig } from "./config/app.config";
import { authConfig } from "./config/auth.config";
import { updateSession } from "@/lib/supabase/proxy";

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
    pathname.startsWith("/dashboard/organization-invitation")
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname, origin, searchParams } = req.nextUrl;

  // CWE-200: Prevent sensitive data exposure in URLs
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

  // CWE-204: Block TRACE and TRACK methods
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

  // === SUPABASE SESSION REFRESH ===
  // This replaces the Better Auth betterFetch("/api/auth/get-session") call.
  // updateSession() refreshes the Supabase JWT via cookies and returns a response
  // with updated cookies. getClaims() inside does local JWT verification (no network call).
  const supabaseResponse = await updateSession(req);

  // Protected routes that require authentication
  if (isProtectedPath(pathname)) {
    // Re-check claims after session refresh to get user data
    // We need to create a temporary client from the refreshed request
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() { /* no-op for reading */ },
        },
      }
    );

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (!claims) {
      return NextResponse.redirect(
        new URL(
          withQuery("/auth/sign-in", {
            redirectTo: pathname,
          }),
          origin,
        ),
      );
    }

    // Check if user is banned via user_profile
    // Note: This requires a query to user_profile; for performance, consider
    // storing banned status in app_metadata via admin API
    const { data: profile } = await supabase
      .from('user_profile')
      .select('banned, ban_expires, onboarding_complete')
      .eq('id', claims.sub)
      .single();

    if (profile?.banned && pathname !== "/auth/banned") {
      const banExpired =
        profile.ban_expires &&
        new Date(profile.ban_expires) < new Date();

      if (!banExpired) {
        return NextResponse.redirect(new URL("/auth/banned", origin));
      }
    }

    // Check onboarding status
    if (profile && !profile.onboarding_complete && !canBypassOnboarding(pathname)) {
      return NextResponse.redirect(
        new URL(
          withQuery("/dashboard/onboarding", {
            redirectTo: pathname,
          }),
          origin,
        ),
      );
    }

    return supabaseResponse;
  }

  // Handle auth routes - redirect logged-in users away
  if (pathname.startsWith("/auth")) {
    const { createServerClient } = await import('@supabase/ssr');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() { /* no-op */ },
        },
      }
    );

    const { data } = await supabase.auth.getClaims();
    const user = data?.claims;

    if (
      user &&
      pathname !== "/auth/banned" &&
      pathname !== "/auth/reset-password"
    ) {
      const invitationId = req.nextUrl.searchParams.get("invitationId");
      if (invitationId) {
        return NextResponse.redirect(
          new URL(`/dashboard/organization-invitation/${invitationId}`, origin),
        );
      }
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!monitoring|monitoring-tunnel|marketing/avatars|marketing/logos|marketing/placeholders|images|fonts|assets|.well-known|favicon.svg|apple-touch-icon.png|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

### Key differences from current implementation

1. **No `betterFetch` import** - removed `@better-fetch/fetch` dependency usage
2. **No `Session` type import** - no longer needs `types/session`
3. **`updateSession(req)`** replaces `getSession(req)` - handles JWT refresh via cookies
4. **`getClaims()`** replaces the session object - returns JWT claims (`sub`, `email`, `aal`, etc.)
5. **User profile query** for banned/onboarding checks - since these fields are in `user_profile`, not in the JWT
6. **No `impersonatedBy` check** - deferred to later phase

### Verification

- `proxy.ts` compiles without TypeScript errors
- No imports from `better-auth`, `@better-fetch/fetch`, or `types/session`
- Dashboard routes redirect to sign-in when not authenticated
- Auth routes redirect to dashboard when authenticated
- Banned users are redirected to `/auth/banned`
- Onboarding incomplete users are redirected to `/dashboard/onboarding`
- CORS, TRACE/TRACK blocking, and sensitive param checks remain unchanged

---

## Task 11: Rewrite `lib/auth/server.ts`

> For agentic workers: replace all Better Auth server-side auth functions with Supabase equivalents using `getClaims()`. This file is imported by `trpc/init.ts` and various Server Components. Use `cache()` from React to deduplicate calls within a single request.

### Current exports to preserve (with new implementations)

- `getUser()` - replaces `getSession()`, returns user claims + profile
- `assertUserIsOrgMember()` - same signature, uses Supabase query
- `getOrganizationList()` - list orgs the user belongs to
- `getUserAccounts()` - list linked OAuth providers (now via Supabase identities)

### New `lib/auth/server.ts`

```typescript
import "server-only";

import { TRPCError } from "@trpc/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Get the current authenticated user from Supabase JWT claims + user_profile.
 *
 * Uses getClaims() which does local JWT verification via Web Crypto API + JWKS caching.
 * No network call to the Auth server (with asymmetric keys).
 *
 * Returns: { id, email, phone, aal, sessionId, isAnonymous, appMetadata, userMetadata, profile }
 * or null if not authenticated.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!data?.claims) {
    if (error) {
      logger.debug({ error }, "getClaims failed");
    }
    return null;
  }

  const claims = data.claims;

  // Fetch the user_profile for custom fields (role, banned, onboarding_complete)
  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', claims.sub)
    .single();

  return {
    id: claims.sub,
    email: claims.email,
    phone: claims.phone,
    aal: claims.aal,
    sessionId: claims.session_id,
    isAnonymous: claims.is_anonymous,
    appMetadata: claims.app_metadata,
    userMetadata: claims.user_metadata,
    profile,
  };
});

/**
 * Backwards-compatible getSession() that returns the same shape as before.
 * Used by tRPC init.ts protectedProcedure.
 */
export const getSession = cache(async () => {
  const user = await getUser();
  if (!user || !user.profile) return null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: user.userMetadata?.full_name ?? user.userMetadata?.name ?? "",
      image: user.userMetadata?.avatar_url ?? null,
      username: user.profile.username,
      role: user.profile.role as "user" | "admin",
      banned: user.profile.banned,
      banReason: user.profile.ban_reason,
      banExpires: user.profile.ban_expires,
      onboardingComplete: user.profile.onboarding_complete,
      twoFactorEnabled: user.aal === "aal2",
      emailVerified: !!user.email, // Supabase only returns email if verified
      createdAt: user.profile.created_at,
      updatedAt: user.profile.updated_at,
    },
    session: {
      // Supabase session metadata
      activeOrganizationId: null as string | null, // Read from cookie in tRPC init
      impersonatedBy: null as string | null, // Deferred feature
    },
  };
});

/**
 * Assert that a user is a member of the specified organization.
 * Returns the organization and membership data.
 * Throws TRPCError if not a member.
 */
export async function assertUserIsOrgMember(
  organizationId: string,
  userId: string,
) {
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from('member')
    .select('*, organization(*)')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();

  if (error || !member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of the organization",
    });
  }

  if (!member.organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  return {
    organization: member.organization,
    membership: {
      id: member.id,
      userId: member.user_id,
      organizationId: member.organization_id,
      role: member.role,
      createdAt: member.created_at,
    },
  };
}

/**
 * List all organizations the current user belongs to.
 */
export const getOrganizationList = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) return [];

    const { data: members } = await supabase
      .from('member')
      .select('organization(*), role')
      .eq('user_id', claims.claims.sub);

    if (!members) return [];

    return members
      .filter((m) => m.organization !== null)
      .map((m) => ({
        ...m.organization!,
        role: m.role,
      }));
  } catch (error) {
    logger.debug({ error }, "Failed to list organizations");
    return [];
  }
});

/**
 * List linked identity providers for the current user.
 * Replaces Better Auth's listUserAccounts().
 */
export const getUserAccounts = cache(async () => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.identities) return [];

    return user.identities.map((identity) => ({
      providerId: identity.provider,
      accountId: identity.id,
      createdAt: identity.created_at,
      updatedAt: identity.updated_at,
    }));
  } catch (error) {
    logger.debug({ error }, "Failed to list user accounts");
    return [];
  }
});
```

### Verification

- File compiles without TypeScript errors
- No imports from `better-auth` or `@/lib/auth` (the old Better Auth config)
- `getSession()` returns a shape compatible with what `trpc/init.ts` expects
- `assertUserIsOrgMember()` uses Supabase query with `.select('*, organization(*)')`
- `getUser()` and `getSession()` are wrapped in `cache()` for request deduplication

---

## Task 12: Rewrite Auth Client and Session Hook

> For agentic workers: replace the Better Auth client (`lib/auth/client.ts`) and session context hook (`hooks/use-session.tsx`) with Supabase equivalents. The client should export auth helper functions using the browser Supabase client. The session hook should use `supabase.auth.getSession()` and `onAuthStateChange()`.

### New `lib/auth/client.ts`

```typescript
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase auth client helpers for use in client components.
 * Replaces Better Auth's createAuthClient.
 */

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, metadata?: { name?: string }) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata, // stored in user_metadata
    },
  });
}

export async function signInWithOAuth(provider: 'google') {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
}

export async function updateUser(updates: {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
}) {
  const supabase = createClient();
  return supabase.auth.updateUser(updates);
}

// MFA (TOTP)
export async function mfaEnroll() {
  const supabase = createClient();
  return supabase.auth.mfa.enroll({ factorType: 'totp' });
}

export async function mfaChallenge(factorId: string) {
  const supabase = createClient();
  return supabase.auth.mfa.challenge({ factorId });
}

export async function mfaVerify(factorId: string, challengeId: string, code: string) {
  const supabase = createClient();
  return supabase.auth.mfa.verify({ factorId, challengeId, code });
}

export async function mfaUnenroll(factorId: string) {
  const supabase = createClient();
  return supabase.auth.mfa.unenroll({ factorId });
}

export async function mfaListFactors() {
  const supabase = createClient();
  return supabase.auth.mfa.listFactors();
}
```

### New `hooks/use-session.tsx`

```typescript
"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  username: string | null;
  role: string;
  onboarding_complete: boolean;
  banned: boolean;
  ban_reason: string | null;
  ban_expires: string | null;
  created_at: string;
  updated_at: string;
};

type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  username: string | null;
  role: "user" | "admin";
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  onboardingComplete: boolean;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
};

type SessionContextValue = {
  user: SessionUser | null;
  supabaseUser: User | null;
  loaded: boolean;
  reloadSession: () => Promise<void>;
};

const defaultContextValue: SessionContextValue = {
  user: null,
  supabaseUser: null,
  loaded: false,
  reloadSession: async () => {},
};

export const SessionContext =
  React.createContext<SessionContextValue>(defaultContextValue);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [supabaseUser, setSupabaseUser] = React.useState<User | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  const loadSession = React.useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setSupabaseUser(null);
        setLoaded(true);
        return;
      }

      setSupabaseUser(authUser);

      // Fetch user_profile for custom fields
      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({
          id: authUser.id,
          email: authUser.email ?? "",
          name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "",
          image: authUser.user_metadata?.avatar_url ?? null,
          username: profile.username,
          role: profile.role as "user" | "admin",
          banned: profile.banned,
          banReason: profile.ban_reason,
          banExpires: profile.ban_expires,
          onboardingComplete: profile.onboarding_complete,
          twoFactorEnabled: false, // Updated after MFA check
          emailVerified: !!authUser.email_confirmed_at,
        });
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setUser(null);
      setSupabaseUser(null);
    } finally {
      setLoaded(true);
    }
  }, [supabase]);

  React.useEffect(() => {
    loadSession();

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, _session) => {
        loadSession();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadSession]);

  const value = React.useMemo(
    () => ({
      user,
      supabaseUser,
      loaded,
      reloadSession: loadSession,
    }),
    [user, supabaseUser, loaded, loadSession]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return React.useContext(SessionContext);
}
```

### Verification

- `lib/auth/client.ts` exports all auth methods needed by sign-in/sign-up/settings pages
- `hooks/use-session.tsx` provides `useSession()` hook with a `SessionProvider` wrapper
- No imports from `better-auth` anywhere in these files
- The `SessionUser` type shape matches what components expect (id, email, name, role, banned, onboardingComplete, etc.)

---

## Task 13: Rewrite `trpc/init.ts`

> For agentic workers: update all four tRPC procedure types to use Supabase auth instead of Better Auth. The key change is that `protectedProcedure` now creates a Supabase server client and passes it as `ctx.supabase` to all downstream procedures. The `activeOrganizationId` is read from a dedicated cookie (not from the Better Auth session).

### New `trpc/init.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
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
            : "Something went wrong",
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

const loggingMiddleware = t.middleware(
  async ({ ctx, next, path, type, input }) => {
    const startTime = Date.now();

    const userId = (ctx as { user?: { id?: string } }).user?.id;
    const userEmail = (ctx as { user?: { email?: string } }).user?.email;
    const userRole = (ctx as { user?: { role?: string } }).user?.role;
    const organizationId = (input as { organizationId?: string })
      ?.organizationId;

    // Set Sentry context
    const scope = Sentry.getCurrentScope();
    if (userId) {
      scope.setUser({ id: userId, email: userEmail });
    }
    scope.setContext("trpc", {
      procedure: path,
      type,
      organizationId,
      userRole,
      requestId: ctx.requestId,
    });
    if (organizationId) scope.setTag("organizationId", organizationId);
    if (userRole) scope.setTag("userRole", userRole);
    scope.setTag("procedure", path);
    scope.setTag("procedureType", type);

    try {
      const result = await next();
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
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
 * Public (unauthed) procedure
 */
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(sentryMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * Creates a Supabase server client, verifies the JWT via getClaims(),
 * fetches the user_profile, and passes ctx.supabase for downstream use.
 *
 * Also reads activeOrganizationId from a dedicated httpOnly cookie.
 */
export const protectedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (!data?.claims) {
      logger.error({ error }, "No valid session - getClaims failed");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No valid session.",
      });
    }

    const claims = data.claims;

    // Fetch user_profile for custom fields
    const { data: profile } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', claims.sub)
      .single();

    if (!profile) {
      logger.error({ userId: claims.sub }, "User profile not found");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User profile not found.",
      });
    }

    // Check if user is banned
    if (profile.banned) {
      const banExpired =
        profile.ban_expires &&
        new Date(profile.ban_expires) < new Date();

      if (!banExpired) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is banned.",
        });
      }
    }

    // Read activeOrganizationId from cookie
    const cookieStore = await cookies();
    const activeOrganizationId =
      cookieStore.get("activeOrganizationId")?.value ?? null;

    // Build the user object matching the expected shape
    const user = {
      id: claims.sub,
      email: claims.email ?? "",
      name: claims.user_metadata?.full_name ?? claims.user_metadata?.name ?? "",
      image: claims.user_metadata?.avatar_url ?? null,
      username: profile.username,
      role: profile.role as "user" | "admin",
      banned: profile.banned,
      banReason: profile.ban_reason,
      banExpires: profile.ban_expires,
      onboardingComplete: profile.onboarding_complete,
      twoFactorEnabled: claims.aal === "aal2",
      emailVerified: !!claims.email,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    return next({
      ctx: {
        ...ctx,
        supabase, // Pass Supabase client to all downstream procedures
        user,
        session: {
          activeOrganizationId,
          impersonatedBy: null, // Deferred feature
        },
        activeOrganizationId,
        isImpersonating: false,
      },
    });
  })
  .use(loggingMiddleware)
  .use(sentryMiddleware);

/**
 * Protected (authenticated) admin procedure
 *
 * Verifies the user's profile role is 'admin'.
 */
export const protectedAdminProcedure = protectedProcedure.use(
  ({ ctx, next }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
    }

    return next({ ctx });
  },
);

/**
 * Protected organization procedure
 *
 * Verifies:
 * 1. User is authenticated (from protectedProcedure)
 * 2. There is an active organization (from cookie)
 * 3. User is a member of the active organization (via Supabase query)
 *
 * Provides ctx.organization and ctx.membership.
 */
export const protectedOrganizationProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const { activeOrganizationId } = ctx;

    if (!activeOrganizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization. Please select an organization first.",
      });
    }

    // Query membership with organization data using ctx.supabase (respects RLS)
    const { data: member, error } = await ctx.supabase
      .from('member')
      .select('*, organization(*)')
      .eq('organization_id', activeOrganizationId)
      .eq('user_id', ctx.user.id)
      .single();

    if (error || !member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not a member of the organization",
      });
    }

    if (!member.organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization: member.organization,
        membership: {
          id: member.id,
          userId: member.user_id,
          organizationId: member.organization_id,
          role: member.role,
          createdAt: member.created_at,
        },
      },
    });
  },
);
```

### Key changes from current implementation

| Aspect | Before (Better Auth) | After (Supabase) |
|--------|---------------------|-------------------|
| Session source | `getSession()` via Better Auth API | `getClaims()` local JWT verification |
| User profile | Part of Better Auth `session.user` | Separate query to `user_profile` table |
| Active org | `session.session.activeOrganizationId` | Read from `activeOrganizationId` cookie |
| DB client | Not passed in context | `ctx.supabase` passed to all procedures |
| Org membership check | `assertUserIsOrgMember()` from `lib/auth/server` | Inline Supabase query in procedure |
| Impersonation | `session.session.impersonatedBy` | Deferred (always null) |

### Verification

- File compiles without TypeScript errors
- No imports from `better-auth` or `@/lib/auth/server` (auth functions inlined)
- `ctx.supabase` is available in all `protectedProcedure` handlers
- `activeOrganizationId` is read from cookie, not session
- All four procedure types export correctly: `publicProcedure`, `protectedProcedure`, `protectedAdminProcedure`, `protectedOrganizationProcedure`

---

## Task 14: Create Auth Callback and Confirm Routes

> For agentic workers: create two new API routes that Supabase Auth needs for OAuth callbacks and email verification. These do not exist in the Better Auth setup.

### File: `app/(saas)/auth/callback/route.ts`

This route handles the OAuth callback from Supabase (e.g., after Google sign-in). Supabase redirects here with a `code` query parameter that must be exchanged for a session.

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // In development, don't use forwarded host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // If code exchange fails, redirect to error page or sign-in
  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_error`);
}
```

### File: `app/(saas)/auth/confirm/route.ts`

This route handles email verification links (sign-up confirmation, email change, password reset). Supabase sends a link with `token_hash` and `type` parameters.

```typescript
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirectTo.searchParams.delete("next");
      return NextResponse.redirect(redirectTo);
    }
  }

  // If verification fails, redirect to an error page
  redirectTo.pathname = "/auth/sign-in";
  redirectTo.searchParams.set("error", "verification_failed");
  return NextResponse.redirect(redirectTo);
}
```

### Verification

- Both route files compile without TypeScript errors
- `app/(saas)/auth/callback/route.ts` handles `GET` with `code` parameter
- `app/(saas)/auth/confirm/route.ts` handles `GET` with `token_hash` and `type` parameters
- Both use `createClient()` from `@/lib/supabase/server`
- Supabase dashboard must be configured with:
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback`
  - Email templates point to `/auth/confirm` for verification links

---

## Task 15: Update Auth Pages and Remove Better Auth

> For agentic workers: update the sign-in and sign-up pages to use Supabase auth methods instead of Better Auth, then remove all Better Auth files and dependencies. This is the final task that cuts over from Better Auth.

### Auth pages to update

The sign-in and sign-up pages need to replace `authClient.signIn.email()` / `authClient.signUp.email()` calls with Supabase equivalents.

#### Sign-in page changes

Replace:
```typescript
// Before
import { authClient } from "@/lib/auth/client";
const { error } = await authClient.signIn.email({
  email,
  password,
});
```

With:
```typescript
// After
import { signInWithPassword, signInWithOAuth } from "@/lib/auth/client";

// Email/password
const { error } = await signInWithPassword(email, password);
if (!error) {
  router.push("/dashboard");
}

// Google OAuth
await signInWithOAuth('google');
// No need to handle redirect - Supabase handles it
```

#### Sign-up page changes

Replace:
```typescript
// Before
const { error } = await authClient.signUp.email({
  email,
  password,
  name,
});
```

With:
```typescript
// After
import { signUp } from "@/lib/auth/client";

const { data, error } = await signUp(email, password, { name });
if (!error) {
  // User needs to verify email - show confirmation message
  // Supabase sends verification email automatically
}
```

#### Sign-out changes

Replace all instances of:
```typescript
await authClient.signOut();
```

With:
```typescript
import { signOut } from "@/lib/auth/client";
await signOut();
```

#### Password reset page changes

Replace:
```typescript
await authClient.forgetPassword({ email });
```

With:
```typescript
import { resetPasswordForEmail } from "@/lib/auth/client";
await resetPasswordForEmail(email);
```

#### 2FA/MFA pages

Replace Better Auth's `authClient.twoFactor.*` calls with:
```typescript
import {
  mfaEnroll,
  mfaChallenge,
  mfaVerify,
  mfaUnenroll,
  mfaListFactors,
} from "@/lib/auth/client";

// Enroll
const { data } = await mfaEnroll();
// data.totp.qr_code - QR code data URL
// data.totp.uri - OTP auth URI

// Verify during login
const { data: challenge } = await mfaChallenge(factorId);
const { error } = await mfaVerify(factorId, challenge.id, totpCode);
```

### ActiveOrganizationId Cookie Management

Since Supabase does not manage `activeOrganizationId` in the session, we store it in a dedicated cookie. Add a helper function:

```typescript
// lib/auth/utils.ts
export function setActiveOrganizationCookie(organizationId: string | null) {
  if (organizationId) {
    document.cookie = `activeOrganizationId=${organizationId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } else {
    document.cookie = "activeOrganizationId=; path=/; max-age=0";
  }
}
```

Call this wherever the active organization is switched (organization selector component, after creating an org, etc.).

### Files to DELETE

Remove these files completely:

```
lib/auth/index.ts          # Better Auth config (betterAuth(), plugins, etc.)
app/api/auth/[...all]/route.ts  # Better Auth catch-all API route
```

### Dependencies to REMOVE from `package.json`

```bash
npm uninstall better-auth @better-fetch/fetch
```

### SessionProvider Integration

Update the app layout to wrap children with the new `SessionProvider`:

```typescript
// In the relevant layout file (e.g., app/(saas)/layout.tsx)
import { SessionProvider } from "@/hooks/use-session";

export default function SaaSLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

### Verification

- `npm uninstall better-auth @better-fetch/fetch` completes successfully
- `lib/auth/index.ts` is deleted
- `app/api/auth/[...all]/route.ts` is deleted
- No imports from `better-auth` anywhere in the codebase (search: `grep -r "better-auth" --include="*.ts" --include="*.tsx"`)
- No imports from `@better-fetch/fetch` anywhere
- Sign-in page uses `signInWithPassword()` from new client
- Sign-up page uses `signUp()` from new client
- OAuth uses `signInWithOAuth('google')`
- Sign-out uses `signOut()` from new client
- `SessionProvider` wraps the SaaS layout
- `useSession()` returns `{ user, loaded, reloadSession }` with Supabase data
- `activeOrganizationId` cookie is set when switching organizations
- Run `npm run lint && npm run typecheck` to confirm no errors

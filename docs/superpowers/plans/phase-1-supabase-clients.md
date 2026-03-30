# Phase 1: Supabase Clients Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the four Supabase client files (browser, server, proxy, admin) and update environment variable validation so subsequent phases can use them.
**Depends on:** Phase 0
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md` Section 3, 9

---

## Task 8: Create Supabase Client Files

> For agentic workers: create 5 files in `lib/supabase/`. Each client serves a different purpose. The browser client runs in React client components, the server client runs in tRPC/Server Components with cookie access, the admin client bypasses RLS for webhooks/admin ops, and the proxy client handles session refresh in Next.js 16 middleware.

### File Structure

```
lib/supabase/
├── client.ts          # Browser client (createBrowserClient)
├── server.ts          # Server client (createServerClient + cookies)
├── proxy.ts           # Session refresh for proxy.ts (Next.js 16)
├── admin.ts           # Admin client with service_role key
├── index.ts           # Re-exports
└── database.types.ts  # Auto-generated (from Task 7)
```

### Three Clients: When to Use Each

| Client   | Respects RLS | Where to Use                                | Key Feature                          |
|----------|-------------|---------------------------------------------|--------------------------------------|
| Browser  | Yes         | Client components, hooks                    | Uses browser cookies                 |
| Server   | Yes         | tRPC procedures, Server Components, Actions | Cookie-based, per-request            |
| Admin    | **No**      | Stripe webhooks, admin operations, triggers | Service role key, no session needed  |

### File: `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### File: `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

// IMPORTANT: Do not store in a global variable.
// Always create a new client within each function.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot set cookies.
            // This works because proxy.ts handles session refreshing.
          }
        },
      },
    }
  );
}
```

### File: `lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Admin client bypasses RLS. Use ONLY for:
// - Stripe webhook handlers (no user session available)
// - Platform admin operations
// - Background jobs / triggers
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
    }
  );
}
```

### File: `lib/supabase/proxy.ts`

This file is used by the root `proxy.ts` (Next.js 16 middleware equivalent) to refresh the Supabase session on every request.

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getClaims() - recommended over getUser()
  // Local JWT verification, no network call with asymmetric keys
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### File: `lib/supabase/index.ts`

```typescript
export { createClient } from './client';
export { createClient as createServerClient } from './server';
export { createAdminClient } from './admin';
export type { Database } from './database.types';
```

### Verification

- All 5 files exist in `lib/supabase/`
- `database.types.ts` was generated in Task 7 (Phase 0)
- No TypeScript errors when importing from `@/lib/supabase/client`, `@/lib/supabase/server`, `@/lib/supabase/admin`
- The browser client uses `createBrowserClient` from `@supabase/ssr`
- The server client uses `createServerClient` from `@supabase/ssr` with cookies
- The admin client uses `createClient` from `@supabase/supabase-js` with `service_role` key
- The proxy client uses `createServerClient` with request cookies for middleware

---

## Task 9: Update Environment Variable Validation

> For agentic workers: update `lib/env.ts` to replace Better Auth, Prisma, and S3 environment variables with Supabase ones. Keep all Stripe, email, monitoring, and other unrelated vars unchanged.

### Current file: `lib/env.ts`

The current file uses `@t3-oss/env-nextjs` with `createEnv()`. We need to:

1. **Remove** these server variables:
   - `BETTER_AUTH_SECRET`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`
   - `DATABASE_URL`
   - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION`

2. **Remove** this client variable:
   - `NEXT_PUBLIC_IMAGES_BUCKET_NAME`

3. **Add** this server variable:
   - `SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)`

4. **Add** these client variables:
   - `NEXT_PUBLIC_SUPABASE_URL: z.string().url()`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1)`

5. **Update** `runtimeEnv` to match (remove old entries, add new ones).

### Target `lib/env.ts`

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    // Node
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Auth (Google OAuth - configured in Supabase dashboard)
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

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

  client: {
    NEXT_PUBLIC_NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

    // Supabase
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
  },

  runtimeEnv: {
    // Server
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
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
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

### Also update `.env.example`

Remove:
```bash
# BETTER_AUTH_SECRET="your-secret-here"
# DATABASE_URL="postgresql://postgres:password@localhost:5432/database"
# POSTGRES_USER="postgres"
# POSTGRES_PASSWORD="password"
# POSTGRES_DB="database"
# POSTGRES_HOST="localhost"
# POSTGRES_PORT="5432"
# S3_ACCESS_KEY_ID=""
# S3_SECRET_ACCESS_KEY=""
# S3_ENDPOINT=""
# S3_REGION=""
# NEXT_PUBLIC_IMAGES_BUCKET_NAME=""
```

Add:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Verification

- `lib/env.ts` compiles without TypeScript errors
- No references to `BETTER_AUTH_SECRET`, `DATABASE_URL`, `POSTGRES_*`, `S3_*`, or `NEXT_PUBLIC_IMAGES_BUCKET_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are validated
- `.env.example` has the new Supabase vars
- Run `npm run typecheck` to confirm no errors

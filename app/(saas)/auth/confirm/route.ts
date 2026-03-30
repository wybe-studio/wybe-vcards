import slugify from "@sindresorhus/slugify";
import type { EmailOtpType } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { featuresConfig } from "@/config/features.config";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const token_hash = searchParams.get("token_hash");
	const type = searchParams.get("type") as EmailOtpType | null;
	// "next" is our redirect target. "callback" is Supabase's RedirectTo (from emailRedirectTo)
	// which may contain a nested "next" param (e.g. /auth/confirm?next=/dashboard/invitation/xxx)
	let next = searchParams.get("next") ?? "/dashboard";

	const callbackParam = searchParams.get("callback");
	if (callbackParam) {
		try {
			const callbackUrl = new URL(callbackParam, origin);
			next = callbackUrl.searchParams.get("next") ?? callbackUrl.pathname;
		} catch {
			next = callbackParam;
		}
	}

	if (token_hash && type) {
		const supabase = await createClient();
		const { error } = await supabase.auth.verifyOtp({ type, token_hash });
		if (!error) {
			// Auto-create personal organization for new signups
			if (featuresConfig.personalAccountOnly && type === "signup") {
				try {
					const {
						data: { user },
					} = await supabase.auth.getUser();

					if (user) {
						const adminClient = createAdminClient();
						const name =
							user.user_metadata?.name ||
							user.email?.split("@")[0] ||
							"Account";
						const slug = `${slugify(name, { lowercase: true })}-${nanoid(5)}`;

						await adminClient.rpc("create_organization_with_owner", {
							p_name: name,
							p_slug: slug,
							p_user_id: user.id,
							p_metadata: undefined,
						});
					}
				} catch (orgError) {
					logger.error(
						{ error: orgError },
						"Failed to auto-create personal organization",
					);
					// Don't block the user — they can still access the dashboard
				}
			}

			return NextResponse.redirect(`${origin}${next}`);
		}
	}

	return NextResponse.redirect(
		`${origin}/auth/sign-in?error=verification_failed`,
	);
}

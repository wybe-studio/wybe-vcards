import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/organization/switch
 * Sets the active-organization-id cookie after verifying membership.
 * Body: { organizationId: string } or { organizationId: null } to clear.
 */
export async function POST(request: Request) {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getClaims();

	if (!data?.claims || error) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const { organizationId } = body;

	const cookieStore = await cookies();

	// Clear active organization
	if (!organizationId) {
		cookieStore.delete("active-organization-id");
		return NextResponse.json({ success: true });
	}

	// Verify the user is a member of the organization
	const { data: member } = await supabase
		.from("member")
		.select("id")
		.eq("organization_id", organizationId)
		.eq("user_id", data.claims.sub)
		.maybeSingle();

	if (!member) {
		return NextResponse.json(
			{ error: "Not a member of this organization" },
			{ status: 403 },
		);
	}

	cookieStore.set("active-organization-id", organizationId, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 365, // 1 year
	});

	return NextResponse.json({ success: true });
}

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ code: string }> },
) {
	const { code } = await params;
	const supabase = await createClient();

	// Look up the physical card by code
	const { data: card } = await supabase
		.from("physical_card")
		.select(
			"status, vcard_id, vcard:vcard(slug, organization_id, status, organization:organization(slug))",
		)
		.eq("code", code.toUpperCase())
		.single();

	// Card not found
	if (!card) {
		return NextResponse.json({ error: "Card non trovata" }, { status: 404 });
	}

	// Card disabled
	if (card.status === "disabled") {
		return NextResponse.json(
			{ error: "Questa card e stata disattivata" },
			{ status: 410 },
		);
	}

	// Card not assigned
	if (card.status === "free" || !card.vcard) {
		return NextResponse.json(
			{ error: "Questa card non e ancora associata a un profilo" },
			{ status: 404 },
		);
	}

	// vCard not active
	const vcard = card.vcard as unknown as {
		slug: string;
		status: string;
		organization: { slug: string };
	};
	if (vcard.status !== "active") {
		return NextResponse.json(
			{ error: "Il profilo associato non e attivo" },
			{ status: 410 },
		);
	}

	// Redirect to public vCard page
	const orgSlug = vcard.organization.slug;
	redirect(`/${orgSlug}/${vcard.slug}`);
}

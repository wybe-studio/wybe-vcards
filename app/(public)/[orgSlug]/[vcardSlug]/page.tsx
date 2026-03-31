import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VcardPage } from "@/components/public/vcard-page";
import { appConfig } from "@/config/app.config";
import { createClient } from "@/lib/supabase/server";

type Props = {
	params: Promise<{ orgSlug: string; vcardSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { orgSlug, vcardSlug } = await params;
	const supabase = await createClient();

	const { data: org } = await supabase
		.from("organization")
		.select("id, name")
		.eq("slug", orgSlug)
		.single();

	if (!org) return { title: "Non trovata" };

	const { data: vcard } = await supabase
		.from("vcard")
		.select("first_name, last_name, job_title")
		.eq("organization_id", org.id)
		.eq("slug", vcardSlug)
		.eq("status", "active")
		.single();

	if (!vcard) return { title: "Non trovata" };

	const fullName = `${vcard.first_name} ${vcard.last_name}`;
	return {
		title: `${fullName} | ${org.name}`,
		description: vcard.job_title
			? `${fullName} — ${vcard.job_title} presso ${org.name}`
			: `${fullName} — ${org.name}`,
	};
}

export default async function PublicVcardPage({ params }: Props) {
	const { orgSlug, vcardSlug } = await params;
	const supabase = await createClient();

	// Fetch org by slug
	const { data: org } = await supabase
		.from("organization")
		.select("id, name, slug, logo")
		.eq("slug", orgSlug)
		.single();

	if (!org || !org.slug) notFound();

	// Fetch vcard
	const { data: vcard } = await supabase
		.from("vcard")
		.select("*")
		.eq("organization_id", org.id)
		.eq("slug", vcardSlug)
		.eq("status", "active")
		.single();

	if (!vcard) notFound();

	// Fetch profile and style
	const [{ data: profile }, { data: style }] = await Promise.all([
		supabase
			.from("organization_profile")
			.select("*")
			.eq("organization_id", org.id)
			.single(),
		supabase
			.from("organization_style")
			.select("*")
			.eq("organization_id", org.id)
			.single(),
	]);

	const url = `${appConfig.baseUrl}/${org.slug}/${vcard.slug}`;

	return (
		<VcardPage
			vcard={vcard}
			organization={{ ...org, slug: org.slug! }}
			profile={profile}
			style={style}
			url={url}
		/>
	);
}

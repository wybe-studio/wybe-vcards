import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { appConfig } from "@/config/app.config";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTheme, type VcardPublicData } from "./_components/types";
import { VcardBackground } from "./_components/vcard-background";
import { VcardBody } from "./_components/vcard-body";
import { VcardFooter } from "./_components/vcard-footer";
import { VcardHead } from "./_components/vcard-head";

type Props = {
	params: Promise<{ orgSlug: string; vcardSlug: string }>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function resolveStorageUrl(path: string | null): string | null {
	if (!path) return null;
	if (path.startsWith("http")) return path;
	return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { orgSlug, vcardSlug } = await params;
	const supabase = createAdminClient();

	const { data: org } = await supabase
		.from("organization")
		.select("id, name")
		.eq("slug", orgSlug)
		.single();

	if (!org) return { title: "Non trovata" };

	const { data: vcard } = await supabase
		.from("vcard")
		.select("first_name, last_name, job_title, profile_image")
		.eq("organization_id", org.id)
		.eq("slug", vcardSlug)
		.eq("status", "active")
		.single();

	if (!vcard) return { title: "Non trovata" };

	const fullName = `${vcard.first_name} ${vcard.last_name}`;
	const title = vcard.job_title
		? `${fullName} - ${vcard.job_title} | ${org.name}`
		: `${fullName} | ${org.name}`;

	const description = vcard.job_title
		? `Contatta ${fullName}, ${vcard.job_title} presso ${org.name}.`
		: `Contatta ${fullName} presso ${org.name}.`;

	const avatarUrl = resolveStorageUrl(vcard.profile_image);

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "profile",
			images: avatarUrl ? [avatarUrl] : [],
		},
		twitter: {
			card: "summary",
			title,
			description,
		},
		robots: {
			index: false,
			follow: false,
		},
	};
}

export default async function PublicVcardPage({ params }: Props) {
	const { orgSlug, vcardSlug } = await params;
	const supabase = createAdminClient();

	// 1. Resolve org from slug
	const { data: org } = await supabase
		.from("organization")
		.select("id, name, slug, logo")
		.eq("slug", orgSlug)
		.single();

	if (!org?.slug) notFound();

	// 2. Fetch vcard
	const { data: vcard } = await supabase
		.from("vcard")
		.select("*")
		.eq("organization_id", org.id)
		.eq("slug", vcardSlug)
		.eq("status", "active")
		.single();

	if (!vcard) notFound();

	// 3. Fetch profile and style
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

	// 4. Resolve storage URLs server-side
	const avatarUrl = resolveStorageUrl(vcard.profile_image);
	const logoUrl = resolveStorageUrl(style?.logo_wide ?? org.logo);

	// 5. Build combined public data
	const url = `${appConfig.baseUrl}/${org.slug}/${vcard.slug}`;
	const theme = buildTheme(style);

	const publicData: VcardPublicData = {
		id: vcard.id,
		full_name: `${vcard.first_name} ${vcard.last_name}`,
		job_title: vcard.job_title,
		email: vcard.email,
		phone: vcard.phone,
		phone_secondary: vcard.phone_secondary,
		linkedin_url: vcard.linkedin_url,
		company_name: profile?.company_name ?? org.name,
		company_email: profile?.email ?? null,
		company_phone: profile?.phone ?? null,
		company_website: profile?.website ?? null,
		company_linkedin: profile?.linkedin_url ?? null,
		company_pec: profile?.pec ?? null,
		company_address: profile?.address ?? null,
		company_vat_number: profile?.vat_number ?? null,
		company_sdi_code: profile?.sdi_code ?? null,
		company_legal_address: profile?.legal_address ?? null,
		avatarUrl,
		logoUrl,
		url,
		theme,
	};

	return (
		<div className="relative grid h-full min-h-svh w-full grid-cols-1">
			<VcardBackground theme={theme} />
			<div className="z-10 mx-auto flex w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl md:my-8 md:rounded-2xl 2xl:my-14">
				<VcardHead data={publicData} />
				<VcardBody data={publicData} />
				<VcardFooter />
			</div>
		</div>
	);
}

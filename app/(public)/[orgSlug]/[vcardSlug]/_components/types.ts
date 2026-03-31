export interface VcardTheme {
	mainColor: string;
	accentColor: string;
	lightColor: string;
	button: {
		bgColor: string;
		textColor: string;
	};
	head: {
		bgColor: string;
		textColor: string;
		textMutedColor: string;
	};
}

export interface VcardPublicData {
	// Personal data from vcard table
	id: string;
	full_name: string;
	job_title: string | null;
	email: string | null;
	phone: string | null;
	phone_secondary: string | null;
	linkedin_url: string | null;

	// Company data from organization + organization_profile
	company_name: string;
	company_email: string | null;
	company_phone: string | null;
	company_website: string | null;
	company_linkedin: string | null;
	company_pec: string | null;
	company_address: string | null;
	company_vat_number: string | null;
	company_sdi_code: string | null;
	company_legal_address: string | null;

	// Resolved URLs
	avatarUrl: string | null;
	logoUrl: string | null;

	// Public URL for QR code
	url: string;

	// Theme from organization_style
	theme: VcardTheme;
}

export function buildTheme(
	style: {
		aurora_color_primary: string | null;
		aurora_color_secondary: string | null;
		header_bg_color: string | null;
		header_text_color: string | null;
		button_bg_color: string | null;
		button_text_color: string | null;
		tab_bg_color: string | null;
	} | null,
): VcardTheme {
	return {
		mainColor: style?.aurora_color_primary ?? "#3b82f6",
		accentColor: style?.aurora_color_secondary ?? "#8b5cf6",
		lightColor: style?.tab_bg_color ?? "#f1f5f9",
		button: {
			bgColor: style?.button_bg_color ?? "#1e293b",
			textColor: style?.button_text_color ?? "#ffffff",
		},
		head: {
			bgColor: style?.header_bg_color ?? "#1e293b",
			textColor: style?.header_text_color ?? "#ffffff",
			textMutedColor: style?.header_text_color
				? `${style.header_text_color}b3`
				: "rgba(255,255,255,0.7)",
		},
	};
}

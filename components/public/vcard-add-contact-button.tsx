"use client";

import { UserPlusIcon } from "lucide-react";
import { generateVcf } from "@/lib/vcard/generate-vcf";

interface VcardAddContactButtonProps {
	firstName: string;
	lastName: string;
	jobTitle?: string | null;
	email?: string | null;
	phone?: string | null;
	phoneSecondary?: string | null;
	linkedinUrl?: string | null;
	companyName?: string | null;
	companyPhone?: string | null;
	companyEmail?: string | null;
	companyWebsite?: string | null;
	companyAddress?: string | null;
	buttonBgColor?: string | null;
	buttonTextColor?: string | null;
}

export function VcardAddContactButton({
	firstName,
	lastName,
	jobTitle,
	email,
	phone,
	phoneSecondary,
	linkedinUrl,
	companyName,
	companyPhone,
	companyEmail,
	companyWebsite,
	companyAddress,
	buttonBgColor,
	buttonTextColor,
}: VcardAddContactButtonProps) {
	const bgColor = buttonBgColor || "#6366f1";
	const textColor = buttonTextColor || "#ffffff";

	const handleDownload = () => {
		const vcf = generateVcf({
			firstName,
			lastName,
			jobTitle,
			email,
			phone,
			phoneSecondary,
			linkedinUrl,
			companyName,
			companyPhone,
			companyEmail,
			companyWebsite,
			companyAddress,
		});

		const blob = new Blob([vcf], { type: "text/vcard" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${firstName}-${lastName}.vcf`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<button
			type="button"
			onClick={handleDownload}
			className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-lg transition-transform active:scale-95"
			style={{ backgroundColor: bgColor, color: textColor }}
		>
			<UserPlusIcon className="h-5 w-5" />
			Aggiungi ai contatti
		</button>
	);
}

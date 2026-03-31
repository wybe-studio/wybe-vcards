import { generateVcf } from "@/lib/vcard/generate-vcf";
import type { VcardPublicData } from "./types";

function isMobileDevice(): boolean {
	if (typeof window === "undefined") return false;
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent,
	);
}

export function downloadVCard(data: VcardPublicData): void {
	const [firstName = "", lastName = ""] = data.full_name.split(" ", 2);
	const vcfString = generateVcf({
		firstName,
		lastName: lastName || firstName,
		jobTitle: data.job_title,
		email: data.email,
		phone: data.phone,
		phoneSecondary: data.phone_secondary,
		linkedinUrl: data.linkedin_url,
		companyName: data.company_name,
		companyPhone: data.company_phone,
		companyEmail: data.company_email,
		companyWebsite: data.company_website,
		companyAddress: data.company_address,
	});

	if (isMobileDevice()) {
		window.location.href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcfString)}`;
	} else {
		const element = document.createElement("a");
		element.setAttribute(
			"href",
			`data:text/vcard;charset=utf-8,${encodeURIComponent(vcfString)}`,
		);
		element.setAttribute("download", `${data.full_name}.vcf`);
		element.style.display = "none";
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	}
}

export function getVCardString(data: VcardPublicData): string {
	const [firstName = "", lastName = ""] = data.full_name.split(" ", 2);
	return generateVcf({
		firstName,
		lastName: lastName || firstName,
		jobTitle: data.job_title,
		email: data.email,
		phone: data.phone,
		phoneSecondary: data.phone_secondary,
		linkedinUrl: data.linkedin_url,
		companyName: data.company_name,
		companyPhone: data.company_phone,
		companyEmail: data.company_email,
		companyWebsite: data.company_website,
		companyAddress: data.company_address,
	});
}

interface VcfData {
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
	profileImageUrl?: string | null;
}

export function generateVcf(data: VcfData): string {
	const lines: string[] = [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`N:${data.lastName};${data.firstName};;;`,
		`FN:${data.firstName} ${data.lastName}`,
	];

	if (data.jobTitle) lines.push(`TITLE:${data.jobTitle}`);
	if (data.companyName) lines.push(`ORG:${data.companyName}`);
	if (data.email) lines.push(`EMAIL;TYPE=WORK:${data.email}`);
	if (data.phone) lines.push(`TEL;TYPE=CELL:${data.phone}`);
	if (data.phoneSecondary) lines.push(`TEL;TYPE=WORK:${data.phoneSecondary}`);
	if (data.companyPhone) lines.push(`TEL;TYPE=MAIN:${data.companyPhone}`);
	if (data.companyWebsite) lines.push(`URL:${data.companyWebsite}`);
	if (data.companyAddress)
		lines.push(`ADR;TYPE=WORK:;;${data.companyAddress};;;;`);
	if (data.linkedinUrl) lines.push(`URL;TYPE=LINKEDIN:${data.linkedinUrl}`);

	lines.push("END:VCARD");
	return lines.join("\r\n");
}

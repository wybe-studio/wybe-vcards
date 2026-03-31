"use client";

import { useState } from "react";
import { VcardAddContactButton } from "@/components/public/vcard-add-contact-button";
import { VcardAurora } from "@/components/public/vcard-aurora";
import { VcardCompanyTab } from "@/components/public/vcard-company-tab";
import { VcardContactsTab } from "@/components/public/vcard-contacts-tab";
import { VcardHeader } from "@/components/public/vcard-header";
import { VcardQrDialog } from "@/components/public/vcard-qr-dialog";
import { cn } from "@/lib/utils";

interface VcardPageProps {
	vcard: {
		first_name: string;
		last_name: string;
		slug: string;
		job_title: string | null;
		email: string | null;
		phone: string | null;
		phone_secondary: string | null;
		linkedin_url: string | null;
		profile_image: string | null;
	};
	organization: {
		id: string;
		name: string;
		slug: string;
		logo: string | null;
	};
	profile: {
		company_name: string | null;
		phone: string | null;
		email: string | null;
		website: string | null;
		address: string | null;
		pec: string | null;
	} | null;
	style: {
		aurora_color_primary: string | null;
		aurora_color_secondary: string | null;
		header_bg_color: string | null;
		header_text_color: string | null;
		button_bg_color: string | null;
		button_text_color: string | null;
		tab_bg_color: string | null;
	} | null;
	url: string;
}

export function VcardPage({
	vcard,
	organization,
	profile,
	style,
	url,
}: VcardPageProps) {
	const [activeTab, setActiveTab] = useState<"contacts" | "company">(
		"contacts",
	);
	const tabBgColor = style?.tab_bg_color || "#f1f5f9";

	return (
		<div className="relative flex min-h-screen flex-col items-center">
			<VcardAurora
				colorPrimary={style?.aurora_color_primary}
				colorSecondary={style?.aurora_color_secondary}
			/>

			<div className="w-full max-w-md">
				<VcardHeader
					firstName={vcard.first_name}
					lastName={vcard.last_name}
					jobTitle={vcard.job_title}
					profileImage={vcard.profile_image}
					orgName={organization.name}
					orgLogo={organization.logo}
					headerBgColor={style?.header_bg_color}
					headerTextColor={style?.header_text_color}
				/>

				<div className="px-4">
					<div className="mt-4">
						<VcardAddContactButton
							firstName={vcard.first_name}
							lastName={vcard.last_name}
							jobTitle={vcard.job_title}
							email={vcard.email}
							phone={vcard.phone}
							phoneSecondary={vcard.phone_secondary}
							linkedinUrl={vcard.linkedin_url}
							companyName={profile?.company_name}
							companyPhone={profile?.phone}
							companyEmail={profile?.email}
							companyWebsite={profile?.website}
							companyAddress={profile?.address}
							buttonBgColor={style?.button_bg_color}
							buttonTextColor={style?.button_text_color}
						/>
					</div>

					<div
						className="mt-4 flex rounded-xl p-1"
						style={{ backgroundColor: tabBgColor }}
					>
						<button
							type="button"
							onClick={() => setActiveTab("contacts")}
							className={cn(
								"flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors",
								activeTab === "contacts"
									? "bg-white shadow-sm dark:bg-gray-800"
									: "text-muted-foreground",
							)}
						>
							Contatti
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("company")}
							className={cn(
								"flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors",
								activeTab === "company"
									? "bg-white shadow-sm dark:bg-gray-800"
									: "text-muted-foreground",
							)}
						>
							Azienda
						</button>
					</div>

					<div className="mt-4 pb-8">
						{activeTab === "contacts" ? (
							<VcardContactsTab
								email={vcard.email}
								phone={vcard.phone}
								phoneSecondary={vcard.phone_secondary}
								linkedinUrl={vcard.linkedin_url}
							/>
						) : (
							<VcardCompanyTab
								companyName={profile?.company_name}
								phone={profile?.phone}
								email={profile?.email}
								website={profile?.website}
								address={profile?.address}
								pec={profile?.pec}
							/>
						)}
					</div>
				</div>

				<div className="fixed bottom-4 right-4">
					<VcardQrDialog url={url} />
				</div>
			</div>
		</div>
	);
}

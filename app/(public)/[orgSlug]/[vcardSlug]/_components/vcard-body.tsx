"use client";

import {
	Building2,
	Globe,
	Hash,
	Mail,
	MailCheck,
	MapPin,
	Phone,
	RectangleEllipsis,
	Smartphone,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GradualBlur from "./gradual-blur";
import type { VcardPublicData } from "./types";
import { VcardButton } from "./vcard-button";
import { VcardList, type VcardListItem } from "./vcard-list";

const LinkedInIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		fill="currentColor"
		viewBox="0 0 16 16"
	>
		<path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
	</svg>
);

function removeSpaces(str: string | null): string {
	if (!str) return "";
	return str.replace(/\s+/g, "");
}

interface VcardBodyProps {
	data: VcardPublicData;
}

export function VcardBody({ data }: VcardBodyProps) {
	const { theme } = data;

	const contactData: VcardListItem[] = [
		{
			value: data.phone ?? "",
			label: "Mobile",
			icon: <Smartphone />,
			url: `tel:${removeSpaces(data.phone)}`,
		},
		{
			value: data.phone_secondary ?? "",
			label: "Telefono",
			icon: <Phone />,
			url: `tel:${removeSpaces(data.phone_secondary)}`,
		},
		{
			value: data.email ?? "",
			label: "Email",
			icon: <Mail />,
			url: `mailto:${data.email}`,
		},
		{
			value: data.linkedin_url ?? "",
			label: "LinkedIn",
			icon: <LinkedInIcon />,
			url: data.linkedin_url ?? undefined,
		},
	].filter((item) => item.value) as VcardListItem[];

	const companyData: VcardListItem[] = [
		{
			value: data.company_phone ?? "",
			label: "Telefono",
			icon: <Phone />,
			url: `tel:${removeSpaces(data.company_phone)}`,
		},
		{
			value: data.company_email ?? "",
			label: "Email",
			icon: <Mail />,
			url: `mailto:${data.company_email}`,
		},
		{
			value: data.company_website ?? "",
			label: "Sito web",
			icon: <Globe />,
			url: data.company_website ?? undefined,
		},
		{
			value: data.company_linkedin ?? "",
			label: "LinkedIn",
			icon: <LinkedInIcon />,
			url: data.company_linkedin ?? undefined,
		},
		{
			value: data.company_address ?? "",
			label: "Indirizzo",
			icon: <MapPin />,
		},
		{
			value: data.company_name,
			label: "Ragione Sociale",
			icon: <Building2 />,
		},
		{
			value: data.company_pec ?? "",
			label: "PEC",
			icon: <MailCheck />,
			url: `mailto:${data.company_pec}`,
		},
		{
			value: data.company_vat_number ?? "",
			label: "Partita IVA",
			icon: <RectangleEllipsis />,
		},
		{
			value: data.company_sdi_code ?? "",
			label: "Codice univoco",
			icon: <Hash />,
		},
		{
			value: data.company_legal_address ?? "",
			label: "Sede legale",
			icon: <MapPin />,
		},
	].filter((item) => item.value) as VcardListItem[];

	return (
		<Tabs defaultValue="contacts" className="flex min-h-0 flex-1 flex-col">
			<TabsList
				className="flex w-full shrink-0 justify-center rounded-none pb-0"
				style={{ backgroundColor: theme.lightColor }}
			>
				<TabsTrigger
					value="contacts"
					className="mb-0 flex-0 rounded-b-none border-b-0 px-6 py-4 text-lg !shadow-none"
				>
					Contatti
				</TabsTrigger>
				<TabsTrigger
					value="company"
					className="mb-0 flex-0 rounded-b-none border-b-0 px-6 py-4 text-lg !shadow-none"
				>
					Azienda
				</TabsTrigger>
			</TabsList>
			<ScrollArea className="relative z-0 min-h-0 flex-1 overscroll-contain">
				<TabsContent value="contacts">
					<VcardList items={contactData} iconColor={theme.mainColor} />
				</TabsContent>
				<TabsContent value="company">
					<VcardList items={companyData} iconColor={theme.mainColor} />
				</TabsContent>
				<div className="absolute bottom-0 z-10 flex w-full items-center justify-center py-3">
					<VcardButton data={data} />
				</div>
				<GradualBlur target="parent" preset="bottom" height="70px" zIndex={9} />
			</ScrollArea>
		</Tabs>
	);
}

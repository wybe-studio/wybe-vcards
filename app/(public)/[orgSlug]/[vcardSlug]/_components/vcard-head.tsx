"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { VcardPublicData } from "./types";
import { getVCardString } from "./vcard-utils";

interface VcardHeadProps {
	data: VcardPublicData;
}

export function VcardHead({ data }: VcardHeadProps) {
	const currentURL = typeof window !== "undefined" ? window.location.href : "";
	const { theme } = data;

	const vcardString = getVCardString(data);

	return (
		<>
			<style>{`
				.vcard-head::after {
					background-color: ${theme.lightColor};
				}
			`}</style>
			<div
				className="vcard-head relative h-[300px] overflow-hidden bg-cover bg-left-top bg-no-repeat px-4 pt-4 after:pointer-events-none after:absolute after:bottom-[-25%] after:left-[-15%] after:z-[1] after:h-[130px] after:w-[200%] after:-rotate-7 after:content-[''] md:h-[360px] md:px-6 md:pt-8 after:md:h-[190px] after:md:-rotate-10"
				style={{ backgroundColor: theme.head.bgColor }}
			>
				<div className="mb-7 flex items-center justify-between">
					<div className="relative h-[50px] w-[200px]">
						{data.logoUrl && (
							// biome-ignore lint/performance/noImgElement: external dynamic URL
							<img
								src={data.logoUrl}
								alt={data.company_name}
								className="h-full w-full object-contain object-left"
							/>
						)}
					</div>
					<div className="flex items-center gap-3">
						<Dialog>
							<DialogTrigger asChild>
								<Button variant="outline" size="icon">
									<QrCode className="size-7" />
								</Button>
							</DialogTrigger>
							<DialogContent className="!max-w-md">
								<DialogHeader>
									<DialogTitle>Scansiona il codice</DialogTitle>
									<DialogDescription>
										Scansiona il codice QR per aprire il contatto sul tuo
										dispositivo.
									</DialogDescription>
								</DialogHeader>
								<div className="flex items-center justify-center">
									<QRCodeSVG
										value={vcardString.length < 3000 ? vcardString : currentURL}
										size={256}
										level="L"
									/>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className="sticky top-0 flex flex-col">
					<h1
						className="mb-4 text-4xl font-bold md:mb-6"
						style={{ color: theme.head.textColor }}
					>
						{data.full_name}
					</h1>
					{data.job_title && (
						<p
							className="w-[50%] uppercase"
							style={{ color: theme.head.textMutedColor }}
						>
							{data.job_title}
						</p>
					)}
				</div>

				{data.avatarUrl && (
					<div className="absolute -right-4 bottom-0 z-[2] md:-right-6">
						<div className="relative h-[160px] w-[160px] overflow-hidden rounded-full border-4 border-white md:h-[200px] md:w-[200px]">
							{/* biome-ignore lint/performance/noImgElement: external dynamic URL */}
							<img
								src={data.avatarUrl}
								alt={data.full_name}
								className="h-full w-full object-cover object-center"
							/>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

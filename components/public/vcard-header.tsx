"use client";

import Image from "next/image";

interface VcardHeaderProps {
	firstName: string;
	lastName: string;
	jobTitle?: string | null;
	profileImage?: string | null;
	orgName: string;
	orgLogo?: string | null;
	headerBgColor?: string | null;
	headerTextColor?: string | null;
}

export function VcardHeader({
	firstName,
	lastName,
	jobTitle,
	profileImage,
	orgName,
	orgLogo,
	headerBgColor,
	headerTextColor,
}: VcardHeaderProps) {
	const bgColor = headerBgColor || "#1e293b";
	const textColor = headerTextColor || "#ffffff";

	return (
		<div
			className="relative flex flex-col items-center px-6 pt-8 pb-6"
			style={{ backgroundColor: bgColor, color: textColor }}
		>
			{orgLogo && (
				<div className="absolute top-4 right-4">
					<Image
						src={orgLogo}
						alt={orgName}
						width={40}
						height={40}
						className="h-10 w-10 rounded object-contain"
					/>
				</div>
			)}
			<div className="mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-white/20">
				{profileImage ? (
					<Image
						src={profileImage}
						alt={`${firstName} ${lastName}`}
						width={96}
						height={96}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-white/10 text-2xl font-bold">
						{firstName[0]}
						{lastName[0]}
					</div>
				)}
			</div>
			<h1 className="text-xl font-bold">
				{firstName} {lastName}
			</h1>
			{jobTitle && <p className="mt-1 text-sm opacity-80">{jobTitle}</p>}
			<p className="mt-1 text-xs opacity-60">{orgName}</p>
		</div>
	);
}

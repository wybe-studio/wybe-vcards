"use client";

import { Linkedin, Mail, Nfc, Phone, Smartphone, UserPlus } from "lucide-react";

// -- Static mini vCard (fake data) --------------------------------------------------

function MiniVcard() {
	return (
		<div className="h-full w-full origin-top-left overflow-hidden">
			{/* Header */}
			<div
				className="relative h-[140px] overflow-hidden px-3 pt-3"
				style={{ backgroundColor: "#1e293b" }}
			>
				{/* Fake logo placeholder */}
				<div className="mb-4 flex items-center justify-between">
					<div className="h-5 w-20 rounded bg-white/20" />
				</div>
				{/* Name + title */}
				<div className="flex flex-col">
					<h3 className="mb-1 text-lg font-bold text-white">Marco Rossi</h3>
					<p className="text-[10px] uppercase text-white/60">Sales Manager</p>
				</div>
				{/* Avatar */}
				<div className="absolute -right-2 bottom-0 z-[2]">
					<div className="flex size-[72px] items-center justify-center rounded-full border-2 border-white bg-slate-600 text-sm font-bold text-white">
						MR
					</div>
				</div>
				{/* Diagonal cut (like real vcard) */}
				<div
					className="pointer-events-none absolute -bottom-3 -left-4 h-[50px] w-[200%] -rotate-6"
					style={{ backgroundColor: "#f1f5f9" }}
				/>
			</div>

			{/* Tabs */}
			<div className="flex" style={{ backgroundColor: "#f1f5f9" }}>
				<div className="flex-1 border-b-2 border-slate-800 py-2 text-center text-[10px] font-medium">
					Contatti
				</div>
				<div className="flex-1 py-2 text-center text-[10px] text-muted-foreground">
					Azienda
				</div>
			</div>

			{/* Contact list */}
			<div className="flex flex-col bg-white">
				<MiniContactRow
					icon={<Smartphone className="size-3.5" />}
					value="+39 348 123 4567"
					label="Mobile"
				/>
				<div className="mx-3 border-b" />
				<MiniContactRow
					icon={<Mail className="size-3.5" />}
					value="m.rossi@acme.it"
					label="Email"
				/>
				<div className="mx-3 border-b" />
				<MiniContactRow
					icon={<Linkedin className="size-3.5" />}
					value="linkedin.com/in/mrossi"
					label="LinkedIn"
				/>
			</div>

			{/* Add contact button */}
			<div className="flex items-center justify-center bg-white px-3 py-3">
				<div
					className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[10px] font-medium text-white"
					style={{ backgroundColor: "#1e293b" }}
				>
					<UserPlus className="size-3" />
					Aggiungi contatto
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center justify-center bg-neutral-900 py-2">
				<p className="text-[8px] text-white/60">
					Powered by <span className="text-white/40">Wybe</span>
				</p>
			</div>
		</div>
	);
}

function MiniContactRow({
	icon,
	value,
	label,
}: {
	icon: React.ReactNode;
	value: string;
	label: string;
}) {
	return (
		<div className="flex items-center gap-2 px-3 py-2">
			<div className="flex size-6 items-center justify-center text-blue-500">
				{icon}
			</div>
			<div className="min-w-0 overflow-hidden">
				<p className="truncate text-[10px] font-medium">{value}</p>
				<p className="text-[8px] text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

// -- Smartphone + NFC card frame ----------------------------------------------------

export function HeroVcardAnimation() {
	return (
		<div className="relative flex items-center justify-center py-8">
			{/* Scene container with perspective */}
			<div className="relative" style={{ perspective: "800px" }}>
				{/* Smartphone */}
				<div className="relative h-[450px] w-[220px] overflow-hidden rounded-[2.5rem] border border-neutral-200 bg-neutral-950 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35),0_10px_25px_-8px_rgba(0,0,0,0.2)] lg:h-[500px] lg:w-[245px]">
					{/* Dynamic island */}
					<div className="absolute left-1/2 top-2 z-20 h-[14px] w-[60px] -translate-x-1/2 rounded-full bg-black" />

					{/* Screen area */}
					<div className="absolute inset-[6px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-800 to-slate-900">
						{/* vCard content — initially hidden, revealed by animation */}
						<div className="h-full w-full opacity-0" id="hero-vcard-screen">
							<MiniVcard />
						</div>
					</div>
				</div>

				{/* NFC Card */}
				<div className="absolute -right-8 -top-4 z-10 flex h-[65px] w-[100px] items-center justify-center rounded-xl border border-neutral-100 bg-white shadow-[0_20px_40px_-8px_rgba(0,0,0,0.2),0_8px_16px_-4px_rgba(0,0,0,0.1)]">
					<Nfc className="size-7 text-neutral-400" />
				</div>
			</div>
		</div>
	);
}

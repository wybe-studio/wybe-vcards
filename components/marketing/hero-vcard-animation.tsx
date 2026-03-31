"use client";

import { Linkedin, Mail, Nfc, Smartphone, UserPlus } from "lucide-react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { useRef } from "react";

// -- Static mini vCard (fake data) --------------------------------------------------

function MiniVcard() {
	return (
		<div className="h-full w-full origin-top-left overflow-hidden">
			{/* Header */}
			<div className="relative h-[140px] overflow-hidden bg-slate-800 px-3 pt-3">
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
				<div className="pointer-events-none absolute -bottom-3 -left-4 h-[50px] w-[200%] -rotate-6 bg-slate-100" />
			</div>

			{/* Tabs */}
			<div className="flex bg-slate-100">
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
				<div className="flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-800 py-2 text-[10px] font-medium text-white">
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

const NFC_SHADOW_REST =
	"0 20px 40px -8px rgba(0,0,0,0.2), 0 8px 16px -4px rgba(0,0,0,0.1)";
const NFC_SHADOW_TAP =
	"0 4px 8px -2px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.08)";

const NFC_SHADOW_HOVER =
	"0 25px 50px -10px rgba(0,0,0,0.25), 0 12px 20px -6px rgba(0,0,0,0.15)";

export function HeroVcardAnimation() {
	const nfcControls = useAnimation();
	const screenControls = useAnimation();
	const rippleControls = useAnimation();
	const shouldReduce = useReducedMotion();
	const isPlaying = useRef(false);

	async function playSequence() {
		if (isPlaying.current) return;
		isPlaying.current = true;

		if (shouldReduce) {
			screenControls.start({ opacity: 1, y: 0, transition: { duration: 0 } });
			nfcControls.start({ rotateX: 0, transition: { duration: 0 } });
			isPlaying.current = false;
			return;
		}

		// Phase 1: NFC card flattens and moves toward phone (trapezoid → rectangle)
		await nfcControls.start({
			y: -50,
			rotateX: 0,
			scale: 0.97,
			boxShadow: NFC_SHADOW_TAP,
			transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 },
		});

		// Phase 2 + 3: Ripple and vCard reveal run in parallel, card settles back flat
		await Promise.all([
			rippleControls.start({
				scale: [0, 2.5],
				opacity: [0.5, 0],
				transition: { duration: 0.6, ease: "easeOut" },
			}),
			screenControls.start({
				opacity: 1,
				y: 0,
				transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
			}),
			nfcControls.start({
				y: 0,
				rotateX: 0,
				scale: 1,
				boxShadow: NFC_SHADOW_REST,
				transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 },
			}),
		]);

		isPlaying.current = false;
	}

	function onHover() {
		if (isPlaying.current) return;
		nfcControls.start({
			y: -6,
			scale: 1.02,
			boxShadow: NFC_SHADOW_HOVER,
			transition: { duration: 0.3, ease: "easeOut" },
		});
	}

	function onHoverEnd() {
		if (isPlaying.current) return;
		nfcControls.start({
			y: 0,
			scale: 1,
			boxShadow: NFC_SHADOW_REST,
			transition: { duration: 0.3, ease: "easeOut" },
		});
	}

	return (
		<motion.div
			className="relative flex items-center justify-center py-8 lg:py-0"
			onViewportEnter={() => playSequence()}
			viewport={{ once: true, amount: 0.5 }}
			onHoverStart={onHover}
			onHoverEnd={onHoverEnd}
		>
			{/* Scene container with perspective */}
			<div className="relative scale-[0.8] perspective-dramatic sm:scale-[0.85] lg:scale-100">
				{/* Smartphone */}
				<div className="relative h-[450px] w-[220px] overflow-hidden rounded-[2.5rem] border border-neutral-200 bg-neutral-950 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35),0_10px_25px_-8px_rgba(0,0,0,0.2)] lg:h-[500px] lg:w-[245px]">
					{/* Dynamic island */}
					<div className="absolute left-1/2 top-2 z-20 h-3.5 w-15 -translate-x-1/2 rounded-full bg-black" />

					{/* Screen area */}
					<div className="absolute inset-1.5 overflow-hidden rounded-4xl bg-linear-to-br from-slate-800 to-slate-900">
						{/* Ripple effect — centered on phone screen */}
						<motion.div
							className="pointer-events-none absolute bottom-[30%] left-1/2 z-30 size-16 -translate-x-1/2 rounded-full bg-white/30"
							initial={{ scale: 0, opacity: 0 }}
							animate={rippleControls}
						/>

						{/* vCard content */}
						<motion.div
							className="h-full w-full"
							initial={{ opacity: 0, y: 20 }}
							animate={screenControls}
						>
							<MiniVcard />
						</motion.div>
					</div>
				</div>

				{/* NFC Card — centered, wider than phone, trapezoid perspective (wide at bottom) */}
				<motion.div
					className="absolute -bottom-14 left-1/2 z-10 flex h-30 w-70 -translate-x-1/2 items-center justify-center rounded-2xl border border-neutral-100 bg-white lg:w-75"
					style={{ boxShadow: NFC_SHADOW_REST }}
					initial={{ rotateX: -12, y: 0, scale: 1 }}
					animate={nfcControls}
				>
					<Nfc className="size-10 text-neutral-400" />
				</motion.div>
			</div>
		</motion.div>
	);
}

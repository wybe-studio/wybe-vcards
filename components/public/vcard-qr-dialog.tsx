"use client";

import { QrCodeIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export function VcardQrDialog({ url }: { url: string }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center justify-center rounded-full bg-card p-2 shadow-md transition-transform hover:scale-105"
				aria-label="Mostra QR code"
			>
				<QrCodeIcon className="h-5 w-5 text-foreground" />
			</button>

			{open && (
				// biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
					onClick={() => setOpen(false)}
					onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: dialog content */}
					<div
						className="rounded-2xl bg-white p-8 shadow-2xl"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<QRCodeSVG value={url} size={256} level="M" includeMargin />
						<p className="mt-4 text-center text-xs text-gray-500">
							Scansiona per aprire la vCard
						</p>
					</div>
				</div>
			)}
		</>
	);
}

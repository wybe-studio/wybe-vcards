"use client";

export function VcardAurora({
	colorPrimary,
	colorSecondary,
}: {
	colorPrimary?: string | null;
	colorSecondary?: string | null;
}) {
	const primary = colorPrimary || "#6366f1";
	const secondary = colorSecondary || "#8b5cf6";

	return (
		<div
			className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
			aria-hidden
		>
			<div
				className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] animate-[aurora-spin_12s_ease-in-out_infinite]"
				style={{
					background: `conic-gradient(from 0deg at 50% 50%, ${primary}33, ${secondary}33, ${primary}11, ${secondary}33, ${primary}33)`,
				}}
			/>
			<style>{`
				@keyframes aurora-spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}
			`}</style>
		</div>
	);
}

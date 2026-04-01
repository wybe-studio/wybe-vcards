import Link from "next/link";

export function VcardFooter() {
	return (
		<div className="flex h-[50px] shrink-0 flex-col items-center bg-neutral-900">
			<p className="mt-4 text-sm text-white/80">
				Powered by{" "}
				<Link
					href="https://wybe.it"
					target="_blank"
					title="Wybe"
					rel="noopener"
					className="text-white/60"
				>
					Wybe
				</Link>
			</p>
		</div>
	);
}

"use client";

import Aurora from "./aurora";
import type { VcardTheme } from "./types";

interface VcardBackgroundProps {
	theme: VcardTheme;
}

export function VcardBackground({ theme }: VcardBackgroundProps) {
	return (
		<div className="absolute top-0 left-0 h-full w-full bg-neutral-950">
			<Aurora
				colorStops={[theme.mainColor, theme.accentColor, theme.mainColor]}
				blend={1}
				amplitude={1.0}
				speed={0.9}
			/>
		</div>
	);
}

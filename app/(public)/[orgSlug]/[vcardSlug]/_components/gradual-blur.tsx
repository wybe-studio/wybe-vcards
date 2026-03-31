"use client";

import {
	type CSSProperties,
	memo,
	type PropsWithChildren,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type GradualBlurProps = PropsWithChildren<{
	position?: "top" | "bottom" | "left" | "right";
	strength?: number;
	height?: string;
	width?: string;
	divCount?: number;
	exponential?: boolean;
	zIndex?: number;
	animated?: boolean | "scroll";
	opacity?: number;
	curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
	preset?:
		| "top"
		| "bottom"
		| "left"
		| "right"
		| "subtle"
		| "intense"
		| "smooth"
		| "sharp"
		| "header"
		| "footer"
		| "sidebar";
	target?: "parent" | "page";
	className?: string;
	style?: CSSProperties;
}>;

const DEFAULT_CONFIG: Partial<GradualBlurProps> = {
	position: "bottom",
	strength: 2,
	height: "6rem",
	divCount: 5,
	exponential: false,
	zIndex: 1000,
	animated: false,
	opacity: 1,
	curve: "linear",
	target: "parent",
	className: "",
	style: {},
};

const PRESETS: Record<string, Partial<GradualBlurProps>> = {
	top: { position: "top", height: "6rem" },
	bottom: { position: "bottom", height: "6rem" },
	left: { position: "left", height: "6rem" },
	right: { position: "right", height: "6rem" },
	subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
	intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
	smooth: { height: "8rem", curve: "bezier", divCount: 10 },
	sharp: { height: "5rem", curve: "linear", divCount: 4 },
	header: { position: "top", height: "8rem", curve: "ease-out" },
	footer: { position: "bottom", height: "8rem", curve: "ease-out" },
	sidebar: { position: "left", height: "6rem", strength: 2.5 },
};

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
	linear: (p) => p,
	bezier: (p) => p * p * (3 - 2 * p),
	"ease-in": (p) => p * p,
	"ease-out": (p) => 1 - (1 - p) ** 2,
	"ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
};

const getGradientDirection = (position: string): string => {
	const directions: Record<string, string> = {
		top: "to top",
		bottom: "to bottom",
		left: "to left",
		right: "to right",
	};
	return directions[position] ?? "to bottom";
};

function GradualBlur(props: GradualBlurProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(() => props.animated !== "scroll");

	const config = useMemo(() => {
		const presetConfig: Partial<GradualBlurProps> =
			props.preset && PRESETS[props.preset]
				? (PRESETS[props.preset] ?? {})
				: {};
		return {
			...DEFAULT_CONFIG,
			...presetConfig,
			...props,
		} as Required<GradualBlurProps>;
	}, [props]);

	useEffect(() => {
		if (config.animated !== "scroll" || !containerRef.current) return;
		const observer = new IntersectionObserver(
			([entry]) => setIsVisible(entry?.isIntersecting ?? false),
			{ threshold: 0.1 },
		);
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [config.animated]);

	const blurDivs = useMemo(() => {
		const divs: React.ReactNode[] = [];
		const increment = 100 / config.divCount;
		const currentStrength = config.strength;

		const curveFunc: (p: number) => number =
			CURVE_FUNCTIONS[config.curve] ?? CURVE_FUNCTIONS.linear ?? ((p) => p);

		for (let i = 1; i <= config.divCount; i++) {
			let progress = i / config.divCount;
			progress = curveFunc(progress);

			let blurValue: number;
			if (config.exponential) {
				blurValue = 2 ** (progress * 4) * 0.0625 * currentStrength;
			} else {
				blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength;
			}

			const p1 = Math.round((increment * i - increment) * 10) / 10;
			const p2 = Math.round(increment * i * 10) / 10;
			const p3 = Math.round((increment * i + increment) * 10) / 10;
			const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

			let gradient = `transparent ${p1}%, black ${p2}%`;
			if (p3 <= 100) gradient += `, black ${p3}%`;
			if (p4 <= 100) gradient += `, transparent ${p4}%`;

			const direction = getGradientDirection(config.position);

			const divStyle: CSSProperties = {
				maskImage: `linear-gradient(${direction}, ${gradient})`,
				WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
				backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
				opacity: config.opacity,
			};

			divs.push(<div key={i} className="absolute inset-0" style={divStyle} />);
		}

		return divs;
	}, [config]);

	const containerStyle: CSSProperties = useMemo(() => {
		const isVertical = ["top", "bottom"].includes(config.position);
		const isHorizontal = ["left", "right"].includes(config.position);
		const isPageTarget = config.target === "page";

		const baseStyle: Record<string, unknown> = {
			position: isPageTarget ? "fixed" : "absolute",
			pointerEvents: "none" as const,
			opacity: isVisible ? 1 : 0,
			zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
			...config.style,
		};

		if (isVertical) {
			baseStyle.height = config.height;
			baseStyle.width = config.width ?? "100%";
			baseStyle[config.position] = 0;
			baseStyle.left = 0;
			baseStyle.right = 0;
		} else if (isHorizontal) {
			baseStyle.width = config.width ?? config.height;
			baseStyle.height = "100%";
			baseStyle[config.position] = 0;
			baseStyle.top = 0;
			baseStyle.bottom = 0;
		}

		return baseStyle as CSSProperties;
	}, [config, isVisible]);

	return (
		<div
			ref={containerRef}
			className={`gradual-blur relative isolate ${config.className}`}
			style={containerStyle}
		>
			<div className="relative h-full w-full">{blurDivs}</div>
			{props.children && <div className="relative">{props.children}</div>}
		</div>
	);
}

const GradualBlurMemo = memo(GradualBlur);
GradualBlurMemo.displayName = "GradualBlur";
export default GradualBlurMemo;

"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
	content?: string;
	variant?: "ghost" | "default" | "outline";
	onCopy?: () => void;
	className?: string;
}

export function CopyButton({
	content,
	variant = "ghost",
	onCopy,
	className,
}: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		if (!content) return;
		navigator.clipboard
			.writeText(content)
			.then(() => {
				setCopied(true);
				onCopy?.();
				setTimeout(() => setCopied(false), 3000);
			})
			.catch(() => {
				toast.error("Impossibile copiare");
			});
	}, [content, onCopy]);

	const baseClass =
		"inline-flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 [&_svg]:size-4 [&_svg]:pointer-events-none shrink-0";
	const variantClass =
		variant === "ghost"
			? "hover:bg-accent hover:text-accent-foreground"
			: variant === "outline"
				? "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground"
				: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90";

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={`${baseClass} ${variantClass} ${className ?? ""}`}
			aria-label="Copia"
		>
			{copied ? <CheckIcon /> : <CopyIcon />}
		</button>
	);
}

"use client";

import Link from "next/link";
import { Fragment } from "react";
import { toast } from "sonner";
import { CopyButton } from "./copy-button";

export interface VcardListItem {
	label: string;
	value: string;
	icon: React.JSX.Element;
	url?: string;
}

interface VcardListProps {
	items: VcardListItem[];
	iconColor?: string;
}

export function VcardList({ items, iconColor }: VcardListProps) {
	return (
		<div className="flex w-full max-w-md flex-col gap-0 pb-[70px]">
			{items.map((item, index) => (
				<Fragment key={index}>
					<div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
						<div
							className="flex size-10 items-center justify-center [&_svg]:size-5"
							style={{ color: iconColor ?? "inherit" }}
						>
							{item.icon}
						</div>
						<div className="min-w-0 overflow-hidden">
							{item.url ? (
								<Link
									href={item.url}
									target="_blank"
									className="block truncate text-sm font-medium underline"
								>
									{item.value}
								</Link>
							) : (
								<span className="block truncate text-sm font-medium">
									{item.value}
								</span>
							)}
							<span className="text-xs text-muted-foreground">
								{item.label}
							</span>
						</div>
						<div>
							<CopyButton
								content={item.value}
								variant="ghost"
								onCopy={() => toast.success("Contenuto copiato!")}
							/>
						</div>
					</div>
					{index !== items.length - 1 && <div className="mx-4 border-b" />}
				</Fragment>
			))}
		</div>
	);
}

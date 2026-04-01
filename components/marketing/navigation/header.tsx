"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
	{ title: "Funzionalità", href: "/#features" },
	{ title: "FAQ", href: "/#faq" },
	{ title: "Contatti", href: "/contatti" },
];

export function Header() {
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);
	const { user, loaded } = useSession();

	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);

	useEffect(() => {
		if (menuOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [menuOpen]);

	return (
		<header
			className="sticky top-0 z-50 bg-marketing-bg/80 backdrop-blur-md"
			id="navbar"
		>
			<nav>
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-6 lg:px-10">
					{/* Logo */}
					<div className="flex items-center">
						<Link href="/" className="inline-flex items-stretch">
							<Logo />
						</Link>
					</div>

					{/* Desktop Nav Links */}
					<div className="hidden flex-1 items-center gap-1 lg:flex">
						{NAV_LINKS.map((link) => (
							<Link
								key={link.title}
								href={link.href}
								className={cn(
									"rounded-full px-3 py-1 text-sm font-medium",
									"text-marketing-fg hover:bg-marketing-card-hover transition-colors",
								)}
							>
								{link.title}
							</Link>
						))}
					</div>

					{/* Right Side - Auth & Mobile Menu */}
					<div className="flex items-center justify-end gap-4">
						{/* Desktop Auth */}
						<div className="hidden shrink-0 items-center gap-5 lg:flex">
							{loaded && user ? (
								<Link
									href="/dashboard"
									className={cn(
										"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
										"bg-marketing-accent text-marketing-accent-fg hover:bg-marketing-accent-hover transition-colors",
									)}
								>
									Dashboard
								</Link>
							) : loaded ? (
								<div className="flex items-center gap-5">
									<Link
										href="/auth/sign-in"
										className={cn(
											"inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-sm font-medium",
											"text-marketing-fg hover:bg-marketing-card-hover transition-colors",
										)}
									>
										Accedi
									</Link>
									<Link
										href="/contatti"
										className={cn(
											"inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
											"bg-marketing-accent text-marketing-accent-fg hover:bg-marketing-accent-hover transition-colors",
										)}
									>
										Inizia ora
									</Link>
								</div>
							) : null}
						</div>

						{/* Mobile Menu Button */}
						<button
							type="button"
							onClick={() => setMenuOpen(!menuOpen)}
							aria-label="Toggle menu"
							className={cn(
								"inline-flex cursor-pointer rounded-full p-1.5 lg:hidden",
								"text-marketing-fg hover:bg-marketing-card-hover",
								"dark:hover:bg-white/10",
							)}
						>
							{menuOpen ? (
								<XIcon className="size-6" />
							) : (
								<MenuIcon className="size-6" />
							)}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				{menuOpen && (
					<div
						className="fixed inset-x-0 top-14 z-50 overflow-y-auto border-t bg-white px-6 py-6 dark:bg-neutral-950 lg:hidden"
						style={{ height: "calc(100dvh - 3.5rem)" }}
					>
						<div className="flex flex-col gap-8 pb-20">
							{/* Mobile Auth */}
							<div className="flex flex-col gap-4">
								{loaded && user ? (
									<Link
										href="/dashboard"
										onClick={() => setMenuOpen(false)}
										className="w-full rounded-full bg-marketing-accent py-4 text-center text-xl font-medium text-marketing-accent-fg transition-colors hover:bg-marketing-accent-hover"
									>
										Dashboard
									</Link>
								) : loaded ? (
									<div className="flex flex-col gap-4">
										<Link
											href="/auth/sign-in"
											onClick={() => setMenuOpen(false)}
											className="w-full rounded-full border border-marketing-border py-4 text-center text-xl font-medium text-marketing-fg transition-colors hover:bg-marketing-card-hover"
										>
											Accedi
										</Link>
										<Link
											href="/contatti"
											onClick={() => setMenuOpen(false)}
											className="w-full rounded-full bg-marketing-accent py-4 text-center text-xl font-medium text-marketing-accent-fg transition-colors hover:bg-marketing-accent-hover"
										>
											Inizia ora
										</Link>
									</div>
								) : null}
							</div>

							<hr className="border-marketing-border" />

							<div className="flex flex-col gap-4">
								{NAV_LINKS.map((link) => (
									<Link
										key={link.title}
										href={link.href}
										onClick={() => setMenuOpen(false)}
										className="inline-flex rounded-full px-4 -mx-4 py-2 text-3xl font-medium text-marketing-fg hover:bg-marketing-card-hover transition-colors"
									>
										{link.title}
									</Link>
								))}
							</div>
						</div>
					</div>
				)}
			</nav>
		</header>
	);
}

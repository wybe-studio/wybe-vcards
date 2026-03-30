"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { appConfig } from "@/config/app.config";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const PRODUCT_LINKS = [
	{
		title: "Funzionalità",
		href: "/#features",
		description:
			"Esplora tutti gli strumenti potenti che offriamo per aiutarti a crescere.",
	},
	{
		title: "FAQ",
		href: "/#faq",
		description: "Trova le risposte alle domande più frequenti.",
	},
];

const RESOURCE_LINKS = [
	{
		title: "Blog",
		href: "/blog",
		description: "Resta aggiornato con le ultime notizie e articoli.",
	},
	{
		title: "Documentazione",
		href: "/docs",
		description:
			"Scopri come usare la nostra piattaforma con guide dettagliate.",
	},
	{
		title: "Novità",
		href: "/changelog",
		description: "Scopri le ultime funzionalità e miglioramenti.",
	},
];

const COMPANY_LINKS = [
	{
		title: "Chi siamo",
		href: "/about",
		description: "Scopri di più sulla nostra missione e il team.",
	},
	{
		title: "Lavora con noi",
		href: "/careers",
		description: "Unisciti a noi per costruire il futuro.",
	},
];

export function Header() {
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);
	const { user, loaded } = useSession();

	// Close menu on route change
	useEffect(() => {
		setMenuOpen(false);
	}, [pathname]);

	// Prevent scroll when menu is open
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

	const companyLinks = [
		...COMPANY_LINKS,
		...(appConfig.contact.enabled
			? [
					{
						title: "Contatti",
						href: "/contact",
						description: "Mettiti in contatto con il nostro team di supporto.",
					},
				]
			: []),
	];

	return (
		<header
			className="sticky top-0 z-50 bg-marketing-bg/80 backdrop-blur-md"
			id="navbar"
		>
			<nav>
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-6 lg:px-10">
					{/* Logo - Left */}
					<div className="flex items-center">
						<Link href="/" className="inline-flex items-stretch">
							<Logo />
						</Link>
					</div>

					{/* Desktop Nav Links - Left (after logo) */}
					<div className="hidden flex-1 items-center gap-2 lg:flex">
						<NavigationMenu>
							<NavigationMenuList>
								<NavigationMenuItem>
									<NavigationMenuTrigger className="rounded-full bg-transparent text-marketing-fg hover:bg-marketing-card-hover hover:text-marketing-fg data-[state=open]:bg-marketing-card-hover">
										Prodotto
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
											{PRODUCT_LINKS.map((link) => (
												<ListItem
													key={link.title}
													title={link.title}
													href={link.href}
												>
													{link.description}
												</ListItem>
											))}
										</ul>
									</NavigationMenuContent>
								</NavigationMenuItem>

								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link
											href="/pricing"
											className={cn(
												navigationMenuTriggerStyle(),
												"rounded-full bg-transparent text-marketing-fg hover:bg-marketing-card-hover hover:text-marketing-fg focus:bg-marketing-card-hover focus:text-marketing-fg",
											)}
										>
											Prezzi
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>

								<NavigationMenuItem>
									<NavigationMenuTrigger className="rounded-full bg-transparent text-marketing-fg hover:bg-marketing-card-hover hover:text-marketing-fg data-[state=open]:bg-marketing-card-hover">
										Risorse
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
											{RESOURCE_LINKS.map((link) => (
												<ListItem
													key={link.title}
													title={link.title}
													href={link.href}
												>
													{link.description}
												</ListItem>
											))}
										</ul>
									</NavigationMenuContent>
								</NavigationMenuItem>

								<NavigationMenuItem>
									<NavigationMenuTrigger className="rounded-full bg-transparent text-marketing-fg hover:bg-marketing-card-hover hover:text-marketing-fg data-[state=open]:bg-marketing-card-hover">
										Azienda
									</NavigationMenuTrigger>
									<NavigationMenuContent>
										<ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
											{companyLinks.map((link) => (
												<ListItem
													key={link.title}
													title={link.title}
													href={link.href}
												>
													{link.description}
												</ListItem>
											))}
										</ul>
									</NavigationMenuContent>
								</NavigationMenuItem>
							</NavigationMenuList>
						</NavigationMenu>
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
										href="/auth/sign-up"
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
											href="/auth/sign-up"
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
								<p className="text-xs font-semibold tracking-wider text-marketing-fg-subtle uppercase">
									Prodotto
								</p>
								{PRODUCT_LINKS.map((link) => (
									<Link
										key={link.title}
										href={link.href}
										onClick={() => setMenuOpen(false)}
										className="inline-flex rounded-full px-4 -mx-4 py-2 text-3xl font-medium text-marketing-fg hover:bg-marketing-card-hover transition-colors"
									>
										{link.title}
									</Link>
								))}
								<Link
									href="/pricing"
									onClick={() => setMenuOpen(false)}
									className="inline-flex rounded-full px-4 -mx-4 py-2 text-3xl font-medium text-marketing-fg hover:bg-marketing-card-hover transition-colors"
								>
									Prezzi
								</Link>
							</div>

							<div className="flex flex-col gap-4">
								<p className="text-xs font-semibold tracking-wider text-marketing-fg-subtle uppercase">
									Risorse
								</p>
								{RESOURCE_LINKS.map((link) => (
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

							<div className="flex flex-col gap-4">
								<p className="text-xs font-semibold tracking-wider text-marketing-fg-subtle uppercase">
									Azienda
								</p>
								{companyLinks.map((link) => (
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

function ListItem({
	className,
	title,
	children,
	href,
	...props
}: React.ComponentPropsWithoutRef<"a"> & { title: string; href: string }) {
	return (
		<li>
			<NavigationMenuLink asChild>
				<Link
					href={href}
					className={cn(
						"block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-marketing-card-hover hover:text-marketing-fg focus:bg-marketing-card-hover focus:text-marketing-fg",
						className,
					)}
					{...props}
				>
					<div className="text-sm font-medium leading-none text-marketing-fg">
						{title}
					</div>
					<p className="line-clamp-2 text-sm leading-snug text-marketing-fg-muted">
						{children}
					</p>
				</Link>
			</NavigationMenuLink>
		</li>
	);
}

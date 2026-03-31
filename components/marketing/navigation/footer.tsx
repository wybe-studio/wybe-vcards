"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { appConfig } from "@/config/app.config";

const footerLinks = [
	{
		group: "Prodotto",
		items: [
			{ title: "Funzionalità", href: "/#features" },
			{ title: "FAQ", href: "/#faq" },
		],
	},
	{
		group: "Azienda",
		items: [
			...(appConfig.contact.enabled
				? [{ title: "Contatti", href: "/contact" }]
				: []),
		],
	},
	{
		group: "Legale",
		items: [
			{ title: "Privacy policy", href: "/legal/privacy" },
			{ title: "Termini di servizio", href: "/legal/terms" },
			{ title: "Cookie policy", href: "/legal/cookies" },
		],
	},
];

function AppInfo() {
	return (
		<div className="flex max-w-sm flex-col gap-2">
			<Logo withLabel={true} className="text-marketing-fg" />
			<div className="flex flex-col gap-4 text-marketing-fg-muted">
				<p>{appConfig.description}</p>
			</div>
		</div>
	);
}

export function Footer() {
	return (
		<footer className="pt-24" id="footer">
			<div className="bg-marketing-card/50 border-t border-marketing-border py-16">
				<div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 lg:px-10">
					{/* Top Section */}
					<div className="grid grid-cols-1 gap-x-12 gap-y-16 text-sm lg:grid-cols-2">
						{/* App Info */}
						<AppInfo />

						{/* Links Grid */}
						<nav className="grid grid-cols-2 gap-8 sm:grid-cols-3">
							{footerLinks.map((group) => (
								<div key={group.group} className="flex flex-col gap-4">
									<h3 className="font-semibold tracking-wider text-marketing-fg uppercase text-xs">
										{group.group}
									</h3>
									<ul className="flex flex-col gap-3">
										{group.items.map((item) => (
											<li key={item.title}>
												<Link
													href={item.href}
													className="text-marketing-fg-muted hover:text-marketing-fg transition-colors duration-200"
												>
													{item.title}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</nav>
					</div>

					{/* Bottom Section */}
					<div className="flex flex-col items-center justify-between gap-8 border-t border-marketing-border pt-8 sm:flex-row text-sm">
						<div className="text-marketing-fg-muted">
							© {new Date().getFullYear()} {appConfig.appName}. Tutti i diritti
							riservati.
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

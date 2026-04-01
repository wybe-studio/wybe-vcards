"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import type { ElementType } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { TurnstileCaptcha } from "@/components/ui/custom/turnstile";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { appConfig } from "@/config/app.config";
import { useTurnstile } from "@/hooks/use-turnstile";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

const contactFormSchema = z.object({
	firstName: z.string().min(1, "Il nome è obbligatorio"),
	lastName: z.string().min(1, "Il cognome è obbligatorio"),
	email: z.email("Indirizzo email non valido"),
	message: z
		.string()
		.min(10, "Il messaggio deve contenere almeno 10 caratteri"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

type ContactInfoProps = {
	icon: ElementType;
	text: string;
};

function ContactInfo({ icon: Icon, text }: ContactInfoProps) {
	return (
		<div className="flex items-center gap-3 text-sm">
			<Icon className="size-4 shrink-0 text-marketing-fg-subtle" />
			<span className="text-marketing-fg-muted">{text}</span>
		</div>
	);
}

export function ContactSection() {
	const {
		turnstileRef,
		captchaToken,
		captchaEnabled,
		resetCaptcha,
		handleSuccess,
		handleError,
		handleExpire,
	} = useTurnstile();

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			message: "",
		},
	});

	const submitMutation = trpc.contact.submit.useMutation({
		onSuccess: () => {
			toast.success("Messaggio inviato! Ti risponderemo al più presto.");
			form.reset();
			resetCaptcha();
		},
		onError: (error) => {
			toast.error(error.message || "Invio del messaggio fallito. Riprova.");
			resetCaptcha();
		},
	});

	const onSubmit = (data: ContactFormValues) => {
		submitMutation.mutate({
			...data,
			captchaToken: captchaEnabled ? captchaToken : undefined,
		});
	};

	return (
		<main className="isolate overflow-clip">
			{/* Hero Section */}
			<section className="py-16 pt-32 lg:pt-40" id="contact-hero">
				<div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<h1
						className={cn(
							"text-balance font-display text-5xl leading-12 tracking-tight",
							"text-marketing-fg",
							"sm:text-[5rem] sm:leading-20",
						)}
					>
						Contattaci
					</h1>
					<div className="max-w-3xl text-lg leading-8 text-marketing-fg-muted">
						<p>
							Domande su prezzi, funzionalità o piani enterprise? Il nostro team
							è pronto ad aiutarti.
						</p>
					</div>
				</div>
			</section>

			{/* Contact Form Section */}
			<section className="py-16" id="contact-form">
				<div className="mx-auto max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
					<div className="grid gap-16 lg:grid-cols-2">
						{/* Contact Info */}
						<div className="flex flex-col gap-10">
							<div className="flex flex-col gap-6">
								<h2
									className={cn(
										"text-pretty font-display text-[2rem] leading-10 tracking-tight",
										"text-marketing-fg",
										"sm:text-5xl sm:leading-14",
									)}
								>
									Parliamone
								</h2>
								<div className="text-base leading-7 text-marketing-fg-muted text-pretty">
									<p>
										Scrivici un messaggio. Di solito rispondiamo entro 24 ore
										nei giorni lavorativi.
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-4">
								<h3 className="text-sm font-semibold text-marketing-fg">
									Recapiti
								</h3>
								<div className="flex flex-col gap-3">
									<ContactInfo
										icon={PhoneIcon}
										text={appConfig.contact.phone}
									/>
									{appConfig.contact.email && (
										<ContactInfo
											icon={MailIcon}
											text={appConfig.contact.email}
										/>
									)}
									<ContactInfo
										icon={MapPinIcon}
										text={appConfig.contact.address}
									/>
								</div>
							</div>
						</div>

						{/* Contact Form */}
						<div className="rounded-xl bg-marketing-card p-6 sm:p-10">
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="flex flex-col gap-6"
								>
									<div className="grid grid-cols-2 gap-4">
										<FormField
											control={form.control}
											name="firstName"
											render={({ field }) => (
												<FormItem className="col-span-2 sm:col-span-1">
													<FormLabel className="text-marketing-fg">
														Nome
													</FormLabel>
													<FormControl>
														<input
															placeholder="Mario"
															autoComplete="given-name"
															className={cn(
																"flex h-10 w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors",
																"border border-border bg-marketing-bg-elevated text-marketing-fg placeholder:text-marketing-fg-subtle",
																"focus:border-marketing-border-strong focus:ring-1 focus:ring-ring",
															)}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="lastName"
											render={({ field }) => (
												<FormItem className="col-span-2 sm:col-span-1">
													<FormLabel className="text-marketing-fg">
														Cognome
													</FormLabel>
													<FormControl>
														<input
															placeholder="Rossi"
															autoComplete="family-name"
															className={cn(
																"flex h-10 w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors",
																"border border-border bg-marketing-bg-elevated text-marketing-fg placeholder:text-marketing-fg-subtle",
																"focus:border-marketing-border-strong focus:ring-1 focus:ring-ring",
															)}
															{...field}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-marketing-fg">
													Email
												</FormLabel>
												<FormControl>
													<input
														type="email"
														placeholder="mario@esempio.it"
														autoComplete="email"
														className={cn(
															"flex h-10 w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors",
															"border border-border bg-marketing-bg-elevated text-marketing-fg placeholder:text-marketing-fg-subtle",
															"focus:border-marketing-border-strong focus:ring-1 focus:ring-ring",
														)}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="message"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-marketing-fg">
													Messaggio
												</FormLabel>
												<FormControl>
													<textarea
														placeholder="Come possiamo aiutarti?"
														className={cn(
															"flex min-h-[160px] w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors resize-none",
															"border border-border bg-marketing-bg-elevated text-marketing-fg placeholder:text-marketing-fg-subtle",
															"focus:border-marketing-border-strong focus:ring-1 focus:ring-ring",
														)}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									{captchaEnabled && (
										<TurnstileCaptcha
											ref={turnstileRef}
											onSuccess={handleSuccess}
											onError={handleError}
											onExpire={handleExpire}
										/>
									)}
									<button
										type="submit"
										disabled={
											submitMutation.isPending ||
											(captchaEnabled && !captchaToken)
										}
										className={cn(
											"inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-full px-4 py-2.5 text-sm font-medium",
											"bg-marketing-accent text-marketing-accent-fg hover:bg-marketing-accent-hover",
											"disabled:cursor-not-allowed disabled:opacity-50",
										)}
									>
										{submitMutation.isPending
											? "Invio in corso..."
											: "Invia messaggio"}
									</button>
								</form>
							</Form>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}

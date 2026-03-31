"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/use-zod-form";
import { updateOrganizationProfileSchema } from "@/schemas/organization-profile-schemas";
import { trpc } from "@/trpc/client";

export function OrganizationProfileCard(): React.JSX.Element {
	const utils = trpc.useUtils();
	const { data: profile, isPending: isLoading } =
		trpc.organization.profile.get.useQuery();

	const form = useZodForm({
		schema: updateOrganizationProfileSchema,
		values: profile
			? {
					companyName: profile.company_name,
					vatNumber: profile.vat_number,
					fiscalCode: profile.fiscal_code,
					atecoCode: profile.ateco_code,
					sdiCode: profile.sdi_code,
					iban: profile.iban,
					bankName: profile.bank_name,
					pec: profile.pec,
					phone: profile.phone,
					email: profile.email,
					website: profile.website,
					linkedinUrl: profile.linkedin_url,
					facebookUrl: profile.facebook_url,
					instagramUrl: profile.instagram_url,
					address: profile.address,
					legalAddress: profile.legal_address,
					adminContactName: profile.admin_contact_name,
					adminContactEmail: profile.admin_contact_email,
					notes: profile.notes,
				}
			: undefined,
	});

	const updateMutation = trpc.organization.profile.update.useMutation({
		onSuccess: () => {
			toast.success("Profilo aziendale aggiornato");
			utils.organization.profile.get.invalidate();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
				<Card>
					<CardHeader>
						<CardTitle>Profilo aziendale</CardTitle>
						<CardDescription>
							Questi dati vengono mostrati nella scheda "Azienda" di ogni vCard
							pubblica.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Identita legale</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="companyName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Ragione sociale</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="vatNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Partita IVA</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="fiscalCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Codice fiscale</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="atecoCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Codice ATECO</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="legalAddress"
									render={({ field }) => (
										<FormItem className="sm:col-span-2">
											<FormLabel>Sede legale</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Contatti operativi</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Telefono</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													type="email"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="pec"
									render={({ field }) => (
										<FormItem>
											<FormLabel>PEC</FormLabel>
											<FormControl>
												<Input
													type="email"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="website"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Sito web</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="linkedinUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>LinkedIn</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="facebookUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Facebook</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="instagramUrl"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Instagram</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="address"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Indirizzo operativo</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="adminContactName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Contatto amministrativo</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="adminContactEmail"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email contatto amm.</FormLabel>
											<FormControl>
												<Input
													type="email"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Dati fatturazione</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="sdiCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Codice SDI</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="iban"
									render={({ field }) => (
										<FormItem>
											<FormLabel>IBAN</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="bankName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Banca</FormLabel>
											<FormControl>
												<Input {...field} value={field.value ?? ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Note interne</FormLabel>
									<FormControl>
										<Textarea rows={3} {...field} value={field.value ?? ""} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
					<CardFooter>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Salva
						</Button>
					</CardFooter>
				</Card>
			</form>
		</Form>
	);
}

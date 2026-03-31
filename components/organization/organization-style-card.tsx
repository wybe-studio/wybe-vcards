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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useZodForm } from "@/hooks/use-zod-form";
import { updateOrganizationStyleSchema } from "@/schemas/organization-style-schemas";
import { trpc } from "@/trpc/client";

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string | null | undefined;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center gap-3">
			<input
				type="color"
				value={value || "#000000"}
				onChange={(e) => onChange(e.target.value)}
				className="h-10 w-10 cursor-pointer rounded border"
			/>
			<div className="flex-1">
				<span className="text-sm font-medium">{label}</span>
				<Input
					value={value ?? ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder="#000000"
					className="mt-1"
				/>
			</div>
		</div>
	);
}

export function OrganizationStyleCard(): React.JSX.Element {
	const utils = trpc.useUtils();
	const { data: style, isPending: isLoading } =
		trpc.organization.style.get.useQuery();

	const form = useZodForm({
		schema: updateOrganizationStyleSchema,
		values: style
			? {
					auroraColorPrimary: style.aurora_color_primary,
					auroraColorSecondary: style.aurora_color_secondary,
					headerBgColor: style.header_bg_color,
					headerTextColor: style.header_text_color,
					buttonBgColor: style.button_bg_color,
					buttonTextColor: style.button_text_color,
					tabBgColor: style.tab_bg_color,
					slugFormat: style.slug_format as "readable" | "uuid",
				}
			: undefined,
	});

	const updateMutation = trpc.organization.style.update.useMutation({
		onSuccess: () => {
			toast.success("Stile aggiornato");
			utils.organization.style.get.invalidate();
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
						<CardTitle>Stile vCard</CardTitle>
						<CardDescription>
							Personalizza l'aspetto delle vCard pubbliche della tua
							organizzazione.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Effetto Aurora</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="auroraColorPrimary"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Colore primario"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="auroraColorSecondary"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Colore secondario"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">Intestazione</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="headerBgColor"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Sfondo"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="headerTextColor"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Testo"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-medium">
								Bottone "Aggiungi contatto"
							</h4>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="buttonBgColor"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Sfondo"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="buttonTextColor"
									render={({ field }) => (
										<FormItem>
											<ColorField
												label="Testo"
												value={field.value}
												onChange={field.onChange}
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						<FormField
							control={form.control}
							name="tabBgColor"
							render={({ field }) => (
								<FormItem>
									<ColorField
										label="Sfondo barra schede"
										value={field.value}
										onChange={field.onChange}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="slugFormat"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Formato URL vCard</FormLabel>
									<Select
										value={field.value ?? "readable"}
										onValueChange={field.onChange}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="readable">
												Leggibile (mario.rossi)
											</SelectItem>
											<SelectItem value="uuid">
												UUID (codice casuale)
											</SelectItem>
										</SelectContent>
									</Select>
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

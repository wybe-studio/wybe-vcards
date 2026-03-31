"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { CropImageModal } from "@/components/crop-image-modal";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { storageConfig } from "@/config/storage.config";
import { useSession } from "@/hooks/use-session";
import { useStorage } from "@/hooks/use-storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export function OrganizationLogoWideCard(): React.JSX.Element {
	const [deleting, setDeleting] = useState(false);
	const [uploading, setUploading] = useState(false);
	const { user } = useSession();
	const utils = trpc.useUtils();
	const { data: style } = trpc.organization.style.get.useQuery();

	const logoWide = style?.logo_wide ?? null;
	const resolvedUrl = useStorage(logoWide);

	const updateMutation = trpc.organization.style.updateLogoWide.useMutation({
		onSuccess: () => {
			utils.organization.style.get.invalidate();
		},
	});

	const handleRemove = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!logoWide) return;

		setDeleting(true);
		try {
			if (!logoWide.startsWith("http")) {
				const supabase = createClient();
				await supabase.storage
					.from(storageConfig.bucketNames.images)
					.remove([logoWide]);
			}
			await updateMutation.mutateAsync({ logoWide: null });
			toast.success("Logo rimosso con successo");
		} catch {
			toast.error("Impossibile rimuovere il logo");
		} finally {
			setDeleting(false);
		}
	};

	const { getRootProps, getInputProps } = useDropzone({
		onDrop: (acceptedFiles) => {
			NiceModal.show(CropImageModal, {
				image: acceptedFiles[0],
				maxSize: 800,
				aspectRatio: 4,
				outputFormat: "image/webp",
				outputQuality: 0.85,
				onCrop: async (croppedImageData: Blob | null) => {
					if (!croppedImageData || !user) return;

					setUploading(true);
					try {
						const supabase = createClient();

						if (logoWide && !logoWide.startsWith("http")) {
							await supabase.storage
								.from(storageConfig.bucketNames.images)
								.remove([logoWide]);
						}

						const path = `${user.id}/${uuid()}.webp`;
						const { error: uploadError } = await supabase.storage
							.from(storageConfig.bucketNames.images)
							.upload(path, croppedImageData, {
								contentType: "image/webp",
							});

						if (uploadError) throw uploadError;

						await updateMutation.mutateAsync({ logoWide: path });
						toast.success("Logo aggiornato con successo");
					} catch {
						toast.error("Impossibile aggiornare il logo");
					} finally {
						setUploading(false);
					}
				},
			});
		},
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/webp": [".webp"],
			"image/svg+xml": [".svg"],
		},
		multiple: false,
		disabled: uploading || deleting,
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Logo vCard (orizzontale)</CardTitle>
				<CardDescription>
					Logo orizzontale mostrato nell'intestazione delle vCard pubbliche. Se
					non impostato, verrà usato il logo quadrato dell'organizzazione.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-row items-center gap-4">
					<div
						className={cn(
							"relative flex h-16 w-48 items-center justify-center overflow-hidden rounded-md transition-colors",
							!logoWide &&
								"cursor-pointer border border-dashed border-border hover:border-primary",
						)}
						{...getRootProps()}
					>
						<input {...getInputProps()} id="logo-wide-upload-input" />
						{resolvedUrl ? (
							// biome-ignore lint/performance/noImgElement: dynamic storage URL
							<img
								src={resolvedUrl}
								alt="Logo orizzontale"
								className="h-full w-full object-contain"
							/>
						) : (
							<div className="flex items-center gap-2 text-muted-foreground">
								<ImageIcon className="size-5" />
								<span className="text-xs">Carica logo</span>
							</div>
						)}
						{(uploading || deleting) && (
							<div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-card/90">
								<Spinner />
							</div>
						)}
					</div>
					<div className="flex flex-col space-y-1">
						{logoWide ? (
							<div className="flex flex-row items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									type="button"
									onClick={() => {
										const input = document.getElementById(
											"logo-wide-upload-input",
										);
										input?.click();
									}}
									disabled={uploading || deleting}
								>
									Cambia
								</Button>
								<Button
									size="sm"
									variant="ghost"
									type="button"
									onClick={handleRemove}
									disabled={uploading || deleting}
								>
									Rimuovi
								</Button>
							</div>
						) : (
							<span className="text-xs text-muted-foreground">
								Formato consigliato: orizzontale, sfondo trasparente.
							</span>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

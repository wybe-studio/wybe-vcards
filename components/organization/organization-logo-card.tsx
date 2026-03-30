"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { CropImageModal } from "@/components/crop-image-modal";
import { OrganizationLogo } from "@/components/organization/organization-logo";
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
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { useSession } from "@/hooks/use-session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

export function OrganizationLogoCard(): React.JSX.Element | null {
	const router = useRouter();
	const [deleting, setDeleting] = React.useState(false);
	const [uploading, setUploading] = React.useState(false);
	const { user } = useSession();
	const { data: organization } = useActiveOrganization();
	const utils = trpc.useUtils();

	const updateLogoMutation =
		trpc.organization.management.updateLogo.useMutation({
			onSuccess: () => {
				router.refresh();
				utils.organization.list.invalidate();
			},
		});

	const handleRemove = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!organization) return;

		setDeleting(true);
		try {
			// Delete old file from storage
			if (organization.logo && !organization.logo.startsWith("http")) {
				const supabase = createClient();
				await supabase.storage
					.from(storageConfig.bucketNames.images)
					.remove([organization.logo]);
			}

			await updateLogoMutation.mutateAsync({ logo: null });
			toast.success("Logo rimosso con successo");
		} catch (_err) {
			toast.error("Impossibile rimuovere il logo");
		} finally {
			setDeleting(false);
		}
	};

	const { getRootProps, getInputProps } = useDropzone({
		onDrop: (acceptedFiles) => {
			NiceModal.show(CropImageModal, {
				image: acceptedFiles[0],
				onCrop: async (croppedImageData: Blob | null) => {
					if (!(croppedImageData && organization && user)) {
						return;
					}

					setUploading(true);
					try {
						const supabase = createClient();

						// Delete old file from storage
						if (organization.logo && !organization.logo.startsWith("http")) {
							await supabase.storage
								.from(storageConfig.bucketNames.images)
								.remove([organization.logo]);
						}

						const path = `${user.id}/${uuid()}.png`;
						const { error: uploadError } = await supabase.storage
							.from(storageConfig.bucketNames.images)
							.upload(path, croppedImageData, {
								contentType: "image/png",
							});

						if (uploadError) {
							throw new Error("Failed to upload image");
						}

						await updateLogoMutation.mutateAsync({ logo: path });
						toast.success("Logo aggiornato con successo");
					} catch (_err) {
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
		},
		multiple: false,
		disabled: uploading || deleting,
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Logo organizzazione</CardTitle>
				<CardDescription>
					Il logo della tua organizzazione. Sarà visibile al tuo team.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-row items-center gap-4">
					<div
						className={cn(
							"relative size-20 rounded-md transition-colors",
							!organization?.logo &&
								"cursor-pointer border border-border hover:border-primary",
						)}
						{...getRootProps()}
					>
						<input {...getInputProps()} id="logo-upload-input" />
						{organization?.logo ? (
							<OrganizationLogo
								name={organization.name}
								className="size-full rounded-md object-cover"
								src={organization.logo}
							/>
						) : (
							<div className="flex size-full items-center justify-center">
								<ImageIcon className="size-8 shrink-0 text-primary" />
							</div>
						)}
						{(uploading || deleting) && (
							<div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-card/90">
								<Spinner />
							</div>
						)}
					</div>
					<div className="flex flex-col space-y-1">
						{organization?.logo ? (
							<div className="flex flex-row items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									type="button"
									onClick={() => {
										const input = document.getElementById("logo-upload-input");
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
							<>
								<span className="text-sm">Carica un logo</span>
								<span className="text-xs">
									Scegli un&apos;immagine da caricare come logo.
								</span>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

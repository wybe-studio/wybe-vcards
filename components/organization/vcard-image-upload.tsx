"use client";

import NiceModal from "@ebay/nice-modal-react";
import { ImageIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuid } from "uuid";
import { CropImageModal } from "@/components/crop-image-modal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { storageConfig } from "@/config/storage.config";
import { useSession } from "@/hooks/use-session";
import { useStorage } from "@/hooks/use-storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface VcardImageUploadProps {
	value: string | null | undefined;
	onChange: (path: string | null) => void;
}

export function VcardImageUpload({ value, onChange }: VcardImageUploadProps) {
	const { user } = useSession();
	const [uploading, setUploading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const resolvedUrl = useStorage(value);

	const handleRemove = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!value) return;

		setDeleting(true);
		try {
			const supabase = createClient();
			if (!value.startsWith("http")) {
				await supabase.storage
					.from(storageConfig.bucketNames.images)
					.remove([value]);
			}
			onChange(null);
		} finally {
			setDeleting(false);
		}
	};

	const { getRootProps, getInputProps } = useDropzone({
		onDrop: (acceptedFiles) => {
			NiceModal.show(CropImageModal, {
				image: acceptedFiles[0],
				maxSize: 512,
				outputFormat: "image/webp",
				outputQuality: 0.85,
				onCrop: async (croppedImageData: Blob | null) => {
					if (!croppedImageData || !user) return;

					setUploading(true);
					try {
						const supabase = createClient();

						// Delete old file if it exists
						if (value && !value.startsWith("http")) {
							await supabase.storage
								.from(storageConfig.bucketNames.images)
								.remove([value]);
						}

						const path = `${user.id}/${uuid()}.webp`;
						const { error } = await supabase.storage
							.from(storageConfig.bucketNames.images)
							.upload(path, croppedImageData, {
								contentType: "image/webp",
							});

						if (error) throw error;
						onChange(path);
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
		<div className="flex flex-row items-center gap-4">
			<div
				className={cn(
					"relative size-20 rounded-full transition-colors",
					!value && "cursor-pointer border border-border hover:border-primary",
				)}
				{...getRootProps()}
			>
				<input {...getInputProps()} id="vcard-image-upload-input" />
				{resolvedUrl ? (
					// biome-ignore lint/performance/noImgElement: dynamic storage URL
					<img
						src={resolvedUrl}
						alt="Foto profilo vCard"
						className="size-full rounded-full object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center">
						<ImageIcon className="size-8 shrink-0 text-primary" />
					</div>
				)}
				{(uploading || deleting) && (
					<div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-card/90">
						<Spinner />
					</div>
				)}
			</div>
			<div className="flex flex-col space-y-1">
				{value ? (
					<div className="flex flex-row items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							type="button"
							onClick={() => {
								const input = document.getElementById(
									"vcard-image-upload-input",
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
							<TrashIcon className="size-4" />
						</Button>
					</div>
				) : (
					<>
						<span className="text-sm">Foto profilo</span>
						<span className="text-xs text-muted-foreground">
							Carica una foto per la vCard.
						</span>
					</>
				)}
			</div>
		</div>
	);
}

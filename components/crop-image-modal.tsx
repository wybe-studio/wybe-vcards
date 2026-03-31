"use client";

import NiceModal, { type NiceModalHocProps } from "@ebay/nice-modal-react";
import * as React from "react";
import type { ReactCropperElement } from "react-cropper";
import Cropper from "react-cropper";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useEnhancedModal } from "@/hooks/use-enhanced-modal";

export type CropImageModalProps = NiceModalHocProps & {
	image: File | null;
	onCrop: (croppedImage: Blob | null) => void;
	maxSize?: number;
	aspectRatio?: number;
	outputFormat?: "image/png" | "image/webp" | "image/jpeg";
	outputQuality?: number;
};

export const CropImageModal = NiceModal.create<CropImageModalProps>(
	({
		image,
		onCrop,
		maxSize = 256,
		aspectRatio = 1,
		outputFormat = "image/webp",
		outputQuality = 0.85,
	}) => {
		const modal = useEnhancedModal();
		const cropperRef = React.useRef<ReactCropperElement>(null);

		const getCroppedImage = async () => {
			const cropper = cropperRef.current?.cropper;

			const maxWidth =
				aspectRatio >= 1 ? maxSize : Math.round(maxSize * aspectRatio);
			const maxHeight =
				aspectRatio >= 1 ? Math.round(maxSize / aspectRatio) : maxSize;

			const imageBlob = await new Promise<Blob | null>((resolve) => {
				cropper
					?.getCroppedCanvas({
						maxWidth,
						maxHeight,
					})
					.toBlob(resolve, outputFormat, outputQuality);
			});

			return imageBlob;
		};

		const [imageSrc, setImageSrc] = React.useState<string | null>(null);

		// Create and clean up object URL on mount/unmount
		// Using useEffect instead of useMemo to survive React Strict Mode double-mount
		React.useEffect(() => {
			if (!image) {
				setImageSrc(null);
				return;
			}
			const url = URL.createObjectURL(image);
			setImageSrc(url);
			return () => URL.revokeObjectURL(url);
		}, [image]);

		return (
			<Dialog open={modal.visible}>
				<DialogContent
					className="max-w-xl"
					onAnimationEndCapture={modal.handleAnimationEndCapture}
					onClose={modal.handleClose}
				>
					<DialogHeader>
						<DialogTitle>Ritaglia immagine</DialogTitle>
						<DialogDescription>
							Trascina per riposizionare e ridimensionare l'area di ritaglio.
						</DialogDescription>
					</DialogHeader>
					<div>
						{imageSrc && (
							<Cropper
								aspectRatio={aspectRatio}
								guides={true}
								initialAspectRatio={aspectRatio}
								ref={cropperRef}
								src={imageSrc}
								style={{ width: "100%" }}
							/>
						)}
					</div>
					<DialogFooter>
						<Button onClick={modal.handleClose} type="button" variant="outline">
							Annulla
						</Button>
						<Button
							onClick={async () => {
								onCrop(await getCroppedImage());
								modal.handleClose();
							}}
							type="button"
						>
							Salva
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
);

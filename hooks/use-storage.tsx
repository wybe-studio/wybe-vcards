"use client";

import { useMemo } from "react";
import { storageConfig } from "@/config/storage.config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function useStorage(
	image: string | undefined | null,
	fallback?: string,
): string | undefined {
	return useMemo(() => {
		if (!image) {
			return fallback;
		}
		if (image.startsWith("http")) {
			return image;
		}
		return `${supabaseUrl}/storage/v1/object/public/${storageConfig.bucketNames.images}/${image}`;
	}, [image, fallback]);
}

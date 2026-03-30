import { createClient } from "@/lib/supabase/client";

const BUCKET = "images";

/**
 * Get the public URL for an image stored in Supabase Storage.
 * Returns null if path is null/undefined.
 * Returns the path as-is if it's already a full URL.
 */
export function getPublicImageUrl(path: string | null | undefined): string | null {
	if (!path) return null;
	if (path.startsWith("http")) return path;
	const supabase = createClient();
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}

/**
 * Upload an image to Supabase Storage.
 * Returns the file path (not full URL).
 */
export async function uploadImage(file: File | Blob, fileName: string): Promise<string> {
	const supabase = createClient();
	const { data, error } = await supabase.storage
		.from(BUCKET)
		.upload(fileName, file, {
			contentType: file instanceof File ? file.type : "image/png",
			upsert: true,
		});
	if (error) throw error;
	return data.path;
}

/**
 * Delete an image from Supabase Storage.
 */
export async function deleteImage(fileName: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
	if (error) throw error;
}

import { createClient } from "@/lib/supabase/server";

export async function getSignedUrl(
	filePath: string,
	bucket: string,
	expiresIn: number,
): Promise<string> {
	const supabase = await createClient();
	const { data, error } = await supabase.storage
		.from(bucket)
		.createSignedUrl(filePath, expiresIn);

	if (error || !data?.signedUrl) {
		throw new Error(`Failed to get signed URL: ${error?.message}`);
	}

	return data.signedUrl;
}

export async function uploadFile(
	filePath: string,
	bucket: string,
	file: Blob,
	contentType: string,
): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase.storage
		.from(bucket)
		.upload(filePath, file, { contentType, upsert: true });

	if (error) {
		throw new Error(`Failed to upload file: ${error.message}`);
	}
}

# Phase 5: Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate file storage from S3/R2 to Supabase Storage, replacing the presigned URL flow with direct client uploads.
**Depends on:** Phase 1
**Spec:** `docs/superpowers/specs/2026-03-27-supabase-migration-design.md`

---

## Task 24: Migrate storage from S3/R2 to Supabase Storage

### Files

**Create:**
- `lib/storage/storage.ts`

**Modify:**
- `lib/storage/index.ts`
- `hooks/use-storage.tsx`
- Avatar upload components (search for `useStorage` usage)
- Logo upload components
- `trpc/routers/app.ts` (remove storage router)

**Delete:**
- `lib/storage/s3.ts`
- `config/storage.config.ts`
- `trpc/routers/storage/index.ts`
- `app/storage/[...path]/route.ts`

### Steps

- [ ] 1. **Ensure Supabase Storage bucket exists**

  The `images` bucket should already be created in Phase 0 via `supabase/schemas/13-storage.sql`. Verify:

  ```sql
  -- In supabase/schemas/13-storage.sql (should already exist):
  insert into storage.buckets (id, name, public)
  values ('images', 'images', true)
  on conflict (id) do nothing;

  -- RLS policies for storage.objects:
  -- Public read (avatars/logos are public)
  create policy "Public read images" on storage.objects
    for select using (bucket_id = 'images');

  -- Authenticated users can upload
  create policy "Authenticated upload images" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'images');

  -- Users can update their own uploads (filename starts with their user ID)
  create policy "Owner update images" on storage.objects
    for update to authenticated
    using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

  -- Users can delete their own uploads
  create policy "Owner delete images" on storage.objects
    for delete to authenticated
    using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
  ```

  Run `supabase db reset` if needed to apply storage policies.

- [ ] 2. **Create `lib/storage/storage.ts`**

  ```typescript
  import { createClient } from "@/lib/supabase/client";

  const BUCKET = "images";

  /**
   * Get the public URL for an image stored in Supabase Storage.
   * Returns null if the path is null/undefined.
   * If the path is already a full URL (starts with http), returns it as-is.
   */
  export function getPublicImageUrl(path: string | null): string | null {
    if (!path) return null;

    // Already a full URL (e.g., Google OAuth avatar)
    if (path.startsWith("http")) return path;

    const supabase = createClient();
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return publicUrl;
  }

  /**
   * Upload an image to Supabase Storage.
   * Uses upsert to allow replacing existing files.
   *
   * @param file - The File object to upload
   * @param fileName - The storage path/filename (e.g., "user-id/avatar.png")
   * @returns The storage path of the uploaded file
   */
  export async function uploadImage(
    file: File,
    fileName: string,
  ): Promise<string> {
    const supabase = createClient();

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    return fileName;
  }

  /**
   * Delete an image from Supabase Storage.
   *
   * @param fileName - The storage path/filename to delete
   */
  export async function deleteImage(fileName: string): Promise<void> {
    if (!fileName || fileName.startsWith("http")) return;

    const supabase = createClient();

    const { error } = await supabase.storage.from(BUCKET).remove([fileName]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
  ```

- [ ] 3. **Update `lib/storage/index.ts`**

  Replace the S3 re-export with the new storage module:

  ```typescript
  export { getPublicImageUrl, uploadImage, deleteImage } from "./storage";
  ```

- [ ] 4. **Update `hooks/use-storage.tsx`**

  Replace the S3 proxy URL pattern with direct Supabase public URL:

  ```typescript
  "use client";

  import { useMemo } from "react";
  import { getPublicImageUrl } from "@/lib/storage/storage";

  export function useStorage(
    image: string | undefined | null,
    fallback?: string,
  ): string | undefined {
    return useMemo(() => {
      if (!image) {
        return fallback;
      }
      // getPublicImageUrl handles both full URLs and storage paths
      return getPublicImageUrl(image) ?? fallback;
    }, [image, fallback]);
  }
  ```

- [ ] 5. **Update avatar upload components**

  Search for components that use the old storage flow (presigned URLs via tRPC). The pattern changes from:

  ```typescript
  // OLD: Request presigned URL from server, then upload to S3
  const { url } = await trpc.storage.getUploadUrl.mutate({ path: fileName });
  await fetch(url, { method: "PUT", body: file });
  ```

  To:

  ```typescript
  // NEW: Direct upload to Supabase Storage
  import { uploadImage, deleteImage } from "@/lib/storage/storage";
  import { nanoid } from "nanoid";

  // Generate a unique filename with user ID prefix (for RLS)
  const fileName = `${userId}/${nanoid()}.${file.name.split(".").pop()}`;

  // Delete old image if exists
  if (currentImagePath) {
    await deleteImage(currentImagePath);
  }

  // Upload new image
  const path = await uploadImage(file, fileName);

  // Save the path to the database (via tRPC mutation)
  await updateProfile({ image: path });
  ```

  Find and update these components:
  ```bash
  grep -r "storage.getUploadUrl\|getSignedUploadUrl\|useStorage" --include="*.tsx" --include="*.ts" app/ components/
  ```

- [ ] 6. **Update logo upload components**

  Same pattern as avatar upload. Logos should use an org-prefixed path:

  ```typescript
  const fileName = `org-${organizationId}/${nanoid()}.${file.name.split(".").pop()}`;
  const path = await uploadImage(file, fileName);
  await updateOrganization({ logo: path });
  ```

- [ ] 7. **Delete old S3 storage files**

  ```bash
  rm -f lib/storage/s3.ts
  rm -f config/storage.config.ts
  rm -rf trpc/routers/storage/
  rm -rf app/storage/
  ```

- [ ] 8. **Remove storage router from `trpc/routers/app.ts`**

  ```typescript
  // REMOVE this import and router registration:
  import { storageRouter } from "@/trpc/routers/storage";

  // REMOVE from the app router:
  storage: storageRouter,
  ```

- [ ] 9. **Remove S3 dependencies**

  ```bash
  npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```

- [ ] 10. **Remove S3 environment variables from `.env.example`**

  Remove these lines:
  ```
  S3_ACCESS_KEY_ID=
  S3_SECRET_ACCESS_KEY=
  S3_ENDPOINT=
  S3_REGION=
  NEXT_PUBLIC_IMAGES_BUCKET_NAME=
  ```

- [ ] 11. **Remove S3 env vars from `lib/env.ts`** (if they are defined there)

  Search for and remove S3-related environment variable definitions:
  ```bash
  grep -n "S3_\|IMAGES_BUCKET" lib/env.ts
  ```

- [ ] 12. **Verify no remaining S3 references**

  ```bash
  grep -r "s3\|S3_\|aws-sdk\|storage.config\|storageConfig\|getSignedUrl\|getSignedUploadUrl" --include="*.ts" --include="*.tsx" .
  ```

  Fix any remaining references.

- [ ] 13. **Verify typecheck and lint pass**

  ```bash
  npm run typecheck
  npm run lint
  ```

- [ ] 14. **Test storage functionality manually**

  - Upload an avatar image and verify it appears correctly
  - Upload an organization logo and verify it appears correctly
  - Delete/replace an image and verify the old one is removed
  - Verify that public URLs resolve correctly (images are publicly accessible)

- [ ] 15. **Commit**: `git commit -m "feat(task-24): migrate storage from S3/R2 to Supabase Storage"`

---

## Verification Checklist

After completing this phase:

- [ ] `lib/storage/storage.ts` exists with `getPublicImageUrl`, `uploadImage`, `deleteImage`
- [ ] `lib/storage/index.ts` re-exports from `storage.ts` (not `s3.ts`)
- [ ] `hooks/use-storage.tsx` uses `getPublicImageUrl` instead of proxy URL pattern
- [ ] Avatar upload works end-to-end (upload, display, replace)
- [ ] Logo upload works end-to-end (upload, display, replace)
- [ ] `lib/storage/s3.ts` is deleted
- [ ] `config/storage.config.ts` is deleted
- [ ] `trpc/routers/storage/index.ts` is deleted
- [ ] `app/storage/[...path]/route.ts` is deleted
- [ ] Storage router removed from `trpc/routers/app.ts`
- [ ] `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` uninstalled
- [ ] S3 environment variables removed from `.env.example` and `lib/env.ts`
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No references to S3, aws-sdk, or old storage config remain in the codebase

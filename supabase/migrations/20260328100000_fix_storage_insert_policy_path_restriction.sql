-- Fix: restrict INSERT policy so users can only upload to their own folder
-- Previously any authenticated user could upload to any path in the images bucket

drop policy if exists "Authenticated users can upload images" on storage.objects;

create policy "Authenticated users can upload images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

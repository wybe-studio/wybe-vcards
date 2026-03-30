-- Create the public images bucket for avatars and logos
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Public read access (avatars/logos are public)
create policy "Public read access for images"
  on storage.objects for select
  using (bucket_id = 'images');

-- Authenticated users can upload (only to their own folder)
create policy "Authenticated users can upload images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-only update (UUID in filename matches user)
create policy "Users can update own images"
  on storage.objects for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'images');

-- Owner-only delete
create policy "Users can delete own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

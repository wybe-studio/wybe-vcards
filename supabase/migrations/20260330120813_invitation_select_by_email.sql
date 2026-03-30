-- Allow authenticated users to read invitations addressed to their email
-- This enables the accept/reject flow where the user is not yet an org member
create policy "Users can read invitations addressed to them"
  on public.invitation for select to authenticated
  using (email = auth.jwt() ->> 'email');

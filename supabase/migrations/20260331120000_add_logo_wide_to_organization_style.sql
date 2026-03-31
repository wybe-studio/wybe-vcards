-- Add wide/horizontal logo for public vCard pages.
-- Stores a Supabase Storage path (e.g. "user-id/uuid.webp"), same as other image columns.
-- Falls back to organization.logo (square) when null.

alter table public.organization_style
  add column logo_wide text;

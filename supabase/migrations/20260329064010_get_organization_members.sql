-- Get organization members with user metadata from auth.users
create or replace function public.get_organization_members(p_organization_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role text,
  organization_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_name text,
  user_email text,
  user_image text
)
language sql
security definer
set search_path = ''
as $$
  select
    m.id,
    m.user_id,
    m.role::text,
    m.organization_id,
    m.created_at,
    m.updated_at,
    coalesce(u.raw_user_meta_data->>'name', '') as user_name,
    coalesce(u.email, '') as user_email,
    u.raw_user_meta_data->>'image' as user_image
  from public.member m
  join auth.users u on u.id = m.user_id
  where m.organization_id = p_organization_id;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_organization_members(uuid) to authenticated;

-- Auto-create user_profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profile (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- Protect role and banned fields from non-admin updates
create or replace function public.protect_user_profile_fields()
returns trigger as $$
begin
  -- If the user is not a platform admin, prevent changing role and banned
  if not public.is_platform_admin() then
    new.role := old.role;
    new.banned := old.banned;
    new.ban_reason := old.ban_reason;
    new.ban_expires := old.ban_expires;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger protect_user_profile_fields_trigger
  before update on public.user_profile
  for each row execute function protect_user_profile_fields();


-- Prevent removal of last org owner
create or replace function public.prevent_owner_removal()
returns trigger as $$
declare
  v_owner_count integer;
begin
  if old.role = 'owner' then
    select count(*) into v_owner_count
    from public.member
    where organization_id = old.organization_id
    and role = 'owner'
    and id != old.id;

    if v_owner_count = 0 then
      raise exception 'Cannot remove the last owner of an organization';
    end if;
  end if;
  return old;
end;
$$ language plpgsql security definer;

create trigger prevent_owner_removal_trigger
  before delete on public.member
  for each row execute function prevent_owner_removal();


-- Auto-update updated_at timestamp
create or replace function public.trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all relevant tables
create trigger set_updated_at before update on public.user_profile
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.organization
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.member
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.lead
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.ai_chat
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.subscription
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.subscription_item
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public."order"
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.order_item
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.billing_event
  for each row execute function trigger_set_updated_at();
create trigger set_updated_at before update on public.credit_balance
  for each row execute function trigger_set_updated_at();

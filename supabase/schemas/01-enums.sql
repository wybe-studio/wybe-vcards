-- Billing interval for subscriptions
create type public.billing_interval as enum ('day', 'week', 'month', 'year');

-- Credit transaction types
create type public.credit_transaction_type as enum (
  'purchase', 'subscription_grant', 'bonus', 'promo',
  'usage', 'refund', 'expire', 'adjustment'
);

-- Invitation status
create type public.invitation_status as enum ('pending', 'accepted', 'rejected', 'canceled');

-- Lead source
create type public.lead_source as enum (
  'website', 'referral', 'social_media', 'advertising',
  'cold_call', 'email', 'event', 'other'
);

-- Lead status
create type public.lead_status as enum (
  'new', 'contacted', 'qualified', 'proposal',
  'negotiation', 'won', 'lost'
);

-- Member role in organization
create type public.member_role as enum ('owner', 'admin', 'member');

-- Order status
create type public.order_status as enum (
  'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
);

-- Order type
create type public.order_type as enum ('subscription', 'one_time');

-- Price model
create type public.price_model as enum ('flat', 'per_seat', 'metered');

-- Price type
create type public.price_type as enum ('recurring', 'one_time');

-- Subscription status
create type public.subscription_status as enum (
  'active', 'canceled', 'incomplete', 'incomplete_expired',
  'past_due', 'paused', 'trialing', 'unpaid'
);

-- User role (platform level)
create type public.user_role as enum ('user', 'admin');

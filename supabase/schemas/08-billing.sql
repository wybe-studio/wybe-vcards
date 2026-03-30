-- Subscription (ID is text, from Stripe)
create table public.subscription (
  id text primary key,
  organization_id uuid not null references public.organization(id) on delete cascade,
  stripe_customer_id text not null,
  status public.subscription_status not null,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  interval public.billing_interval not null,
  interval_count integer not null default 1,
  unit_amount integer,
  currency text not null default 'usd',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index subscription_organization_id_idx on public.subscription(organization_id);
create index subscription_stripe_customer_id_idx on public.subscription(stripe_customer_id);
create index subscription_status_idx on public.subscription(status);
create index subscription_stripe_price_id_idx on public.subscription(stripe_price_id);
create index subscription_org_status_idx on public.subscription(organization_id, status);

-- RLS
alter table public.subscription enable row level security;

-- INSERT/UPDATE/DELETE: service_role only (webhook handler)
-- No policies for insert/update/delete for authenticated role.
-- The admin client (service_role) bypasses RLS.


-- Subscription Item (ID is text, from Stripe)
create table public.subscription_item (
  id text primary key,
  subscription_id text not null references public.subscription(id) on delete cascade,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  price_amount integer,
  price_type public.price_type not null default 'recurring',
  price_model public.price_model not null default 'flat',
  interval public.billing_interval,
  interval_count integer default 1,
  meter_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index subscription_item_subscription_id_idx on public.subscription_item(subscription_id);
create index subscription_item_stripe_price_id_idx on public.subscription_item(stripe_price_id);
create index subscription_item_price_model_idx on public.subscription_item(price_model);

-- RLS
alter table public.subscription_item enable row level security;


-- Order
create table public."order" (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  total_amount integer not null,
  currency text not null default 'usd',
  status public.order_status not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index order_organization_id_idx on public."order"(organization_id);
create index order_stripe_customer_id_idx on public."order"(stripe_customer_id);
create index order_status_idx on public."order"(status);
create index order_payment_intent_id_idx on public."order"(stripe_payment_intent_id);
create index order_checkout_session_id_idx on public."order"(stripe_checkout_session_id);

-- RLS
alter table public."order" enable row level security;


-- Order Item
create table public.order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public."order"(id) on delete cascade,
  stripe_price_id text not null,
  stripe_product_id text,
  quantity integer not null default 1,
  unit_amount integer not null,
  total_amount integer not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index order_item_order_id_idx on public.order_item(order_id);
create index order_item_stripe_price_id_idx on public.order_item(stripe_price_id);

-- RLS
alter table public.order_item enable row level security;


-- Billing Event (idempotency tracking for Stripe webhooks)
create table public.billing_event (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  subscription_id text,
  order_id uuid,
  event_data text,
  processed boolean not null default true,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index billing_event_organization_id_idx on public.billing_event(organization_id);
create index billing_event_event_type_idx on public.billing_event(event_type);
create index billing_event_subscription_id_idx on public.billing_event(subscription_id);
create index billing_event_created_at_idx on public.billing_event(created_at);

-- RLS
alter table public.billing_event enable row level security;

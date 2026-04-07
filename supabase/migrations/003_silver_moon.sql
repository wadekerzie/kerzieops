-- Silver Moon attribution support: existing customer snapshot plus webhook observability.

create table public.silver_moon_existing_customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  first_purchase_date date not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.silver_moon_existing_customers is 'Snapshot of Gerry Brundage''s pre-engagement customer base. Matching emails are excluded from Kerzie AI attribution.';
comment on column public.silver_moon_existing_customers.email is 'Stored in lowercase for deterministic attribution checks.';
create unique index silver_moon_existing_customers_email_unique_idx on public.silver_moon_existing_customers (email);
create index silver_moon_existing_customers_purchase_date_idx on public.silver_moon_existing_customers (first_purchase_date desc);

create table public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_account_id text,
  event_type text not null,
  payment_id text,
  source text not null default 'webhook' check (source in ('webhook', 'sync', 'retry')),
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.stripe_webhook_events is 'Operational log of Silver Moon Stripe webhook and sync processing attempts.';
create index stripe_webhook_events_status_idx on public.stripe_webhook_events (status, received_at desc);
create index stripe_webhook_events_payment_idx on public.stripe_webhook_events (payment_id);
create index stripe_webhook_events_source_idx on public.stripe_webhook_events (source, received_at desc);

create trigger set_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row execute function public.set_updated_at();

insert into public.waterfall_config (
  business_unit_id,
  config_key,
  config_value,
  effective_date,
  notes
)
values
  (
    (select id from public.business_units where slug = 'silver_moon'),
    'silver_moon_commission_rate',
    15.0000,
    current_date,
    'Commission rate for Kerzie AI on net attributed Silver Moon sales.'
  ),
  (
    (select id from public.business_units where slug = 'silver_moon'),
    'silver_moon_agreement_effective_date',
    null,
    current_date,
    'Existing customer repurchases excluded. New customer definition: email not present in existing_customers table at time of engagement.'
  );

alter table public.silver_moon_existing_customers enable row level security;
alter table public.stripe_webhook_events enable row level security;

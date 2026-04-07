-- Manual revenue entry, recurring expense management, consulting tracking, and monthly close workflow.

create type public.manual_revenue_type_enum as enum ('recurring', 'one_time', 'setup_fee', 'commission');
create type public.consulting_project_status_enum as enum ('active', 'complete', 'paused');

alter type public.payment_method_enum add value if not exists 'cash';

alter table public.revenue_events
  add column if not exists revenue_type public.manual_revenue_type_enum not null default 'one_time',
  add column if not exists payment_method public.payment_method_enum,
  add column if not exists customer_name text,
  add column if not exists invoice_number text,
  add column if not exists notes text,
  add column if not exists is_setup_fee boolean not null default false,
  add column if not exists is_pending_agreement boolean not null default false,
  add column if not exists review_status text not null default 'unreviewed',
  add column if not exists review_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'revenue_events_review_status_check'
  ) then
    alter table public.revenue_events
      add constraint revenue_events_review_status_check
      check (review_status in ('unreviewed', 'confirmed', 'flagged'));
  end if;
end
$$;

comment on column public.revenue_events.revenue_type is 'Business classification for manual and consulting revenue entry.';
comment on column public.revenue_events.payment_method is 'Customer payment method used for the cash-in event.';
comment on column public.revenue_events.customer_name is 'Customer or client tied to the revenue event.';
comment on column public.revenue_events.invoice_number is 'Optional invoice number captured at entry time.';
comment on column public.revenue_events.notes is 'Free-form bookkeeping notes for the revenue event.';
comment on column public.revenue_events.is_setup_fee is 'Setup fees bypass percentage-based waterfall sweeps and flow straight to the distributable pool after direct cost allocation.';
comment on column public.revenue_events.is_pending_agreement is 'Used for Silver Naturals until the partner percentage agreement is finalized.';
comment on column public.revenue_events.review_status is 'Month-close review state: unreviewed, confirmed, or flagged.';
comment on column public.revenue_events.review_notes is 'Optional anomaly or review notes captured during monthly close.';

create index if not exists revenue_events_pending_agreement_idx
  on public.revenue_events (business_unit_id, is_pending_agreement, transaction_date desc);
create index if not exists revenue_events_review_status_idx
  on public.revenue_events (transaction_date desc, review_status);

alter table public.expenses
  add column if not exists receipt_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists next_billing_date date;

comment on column public.expenses.receipt_url is 'External URL to the stored receipt or invoice, such as Google Drive.';
comment on column public.expenses.is_active is 'Allows recurring subscriptions to be deactivated without deleting the ledger record.';
comment on column public.expenses.next_billing_date is 'Next billing date for recurring subscriptions, especially annual renewals.';

create index if not exists expenses_active_recurring_idx
  on public.expenses (is_active, is_recurring, recurrence_interval, next_billing_date);

alter table public.monthly_snapshots
  add column if not exists setup_fee_revenue numeric(12,2) not null default 0 check (setup_fee_revenue >= 0),
  add column if not exists setup_fee_distributable_pool numeric(12,2) not null default 0;

comment on column public.monthly_snapshots.setup_fee_revenue is 'Gross setup-fee revenue included in the monthly close.';
comment on column public.monthly_snapshots.setup_fee_distributable_pool is 'Net setup-fee cash routed directly to the distributable pool.';

create table if not exists public.consulting_projects (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  project_name text not null,
  client_name text not null,
  project_value numeric(12,2) not null check (project_value >= 0),
  start_date date not null,
  end_date date,
  status public.consulting_project_status_enum not null default 'active',
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint consulting_projects_date_order check (end_date is null or end_date >= start_date)
);

comment on table public.consulting_projects is 'Consulting project tracker for Kerzie AI parent revenue.';

create index if not exists consulting_projects_business_unit_status_idx
  on public.consulting_projects (business_unit_id, status, start_date desc);

create table if not exists public.consulting_project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.consulting_projects(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  payment_date date not null,
  description text,
  invoice_number text,
  notes text,
  revenue_event_id uuid unique references public.revenue_events(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.consulting_project_payments is 'Milestone payments received against consulting projects and linked revenue events.';

create index if not exists consulting_project_payments_project_date_idx
  on public.consulting_project_payments (project_id, payment_date desc);

create table if not exists public.monthly_closes (
  id uuid primary key default gen_random_uuid(),
  close_month date not null unique check (close_month = date_trunc('month', close_month)::date),
  revenue_review_completed boolean not null default false,
  recurring_expenses_confirmed boolean not null default false,
  commissions_review_completed boolean not null default false,
  snapshot_generated boolean not null default false,
  payouts_calculated boolean not null default false,
  pdf_exported boolean not null default false,
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by_email text,
  anomaly_notes text,
  admin_override_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.monthly_closes is 'Checklist and lock state for the guided monthly close workflow.';

create index if not exists monthly_closes_lock_idx
  on public.monthly_closes (close_month desc, is_locked);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_consulting_projects_updated_at'
  ) then
    create trigger set_consulting_projects_updated_at
      before update on public.consulting_projects
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_consulting_project_payments_updated_at'
  ) then
    create trigger set_consulting_project_payments_updated_at
      before update on public.consulting_project_payments
      for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_monthly_closes_updated_at'
  ) then
    create trigger set_monthly_closes_updated_at
      before update on public.monthly_closes
      for each row execute function public.set_updated_at();
  end if;
end
$$;

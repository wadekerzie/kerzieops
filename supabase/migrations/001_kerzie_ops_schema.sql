-- Kerzie Ops foundational schema
-- Business operations and financial tracking for Kerzie Consulting LLC

begin;

create extension if not exists pgcrypto;

-- Shared helper to keep updated_at current on every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Enumerations keep the business vocabulary consistent across the schema.
create type public.partner_role_enum as enum ('owner', 'partner', 'contractor', 'client');
create type public.revenue_source_enum as enum ('stripe', 'ach', 'check', 'manual');
create type public.expense_category_enum as enum ('ops_tax', 'marketing', 'reserve', 'variable', 'capital', 'one_time');
create type public.recurrence_interval_enum as enum ('monthly', 'annual', 'one_time');
create type public.contribution_type_enum as enum ('cash', 'sweat_equity');
create type public.scout_commission_status_enum as enum ('pending', 'paid', 'held');
create type public.payment_method_enum as enum ('ach', 'check', 'stripe');
create type public.ledger_status_enum as enum ('pending', 'paid');

-- business_units: operating entities and brands tracked inside Kerzie Ops.
create table public.business_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug = lower(slug)),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.business_units is 'Operating entities, brands, and internal units tracked by Kerzie Ops.';

-- partners: owners, partners, contractors, and clients who participate in the operating model.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role public.partner_role_enum not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.partners is 'Stakeholders and counterparties that can receive payouts, make contributions, or access reports.';
create unique index partners_email_unique_idx on public.partners (lower(email)) where email is not null;

-- partner_splits: effective-dated ownership and payout logic per business unit.
create table public.partner_splits (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  percentage numeric(7,4) not null check (percentage >= 0 and percentage <= 100),
  effective_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint partner_splits_date_order check (end_date is null or end_date >= effective_date),
  constraint partner_splits_unique_effective unique (business_unit_id, partner_id, effective_date)
);

comment on table public.partner_splits is 'Effective-dated partner payout allocations for each business unit.';
create index partner_splits_business_unit_idx on public.partner_splits (business_unit_id, effective_date desc);
create index partner_splits_partner_idx on public.partner_splits (partner_id, effective_date desc);

-- revenue_events: every customer cash-in event before downstream waterfall allocation.
create table public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  source public.revenue_source_enum not null,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  platform_fee_percentage numeric(7,4) not null default 0 check (platform_fee_percentage >= 0 and platform_fee_percentage <= 100),
  platform_fee_amount numeric(12,2) generated always as (round((gross_amount * platform_fee_percentage) / 100, 2)) stored,
  net_after_platform numeric(12,2) generated always as (round(gross_amount - round((gross_amount * platform_fee_percentage) / 100, 2), 2)) stored,
  transaction_date date not null,
  description text,
  stripe_payment_id text,
  is_attributed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.revenue_events is 'Gross revenue transactions with platform economics preserved for downstream reporting.';
comment on column public.revenue_events.is_attributed is 'Primarily used for Silver Moon to distinguish attributed sales from unattributed revenue.';
create index revenue_events_business_unit_date_idx on public.revenue_events (business_unit_id, transaction_date desc);
create unique index revenue_events_stripe_payment_unique_idx on public.revenue_events (stripe_payment_id) where stripe_payment_id is not null;

-- expenses: recurring and one-time operating costs, optionally attached to a specific business unit.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete set null,
  category public.expense_category_enum not null,
  amount numeric(12,2) not null check (amount >= 0),
  description text not null,
  vendor text,
  expense_date date not null,
  is_recurring boolean not null default false,
  recurrence_interval public.recurrence_interval_enum not null default 'one_time',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.expenses is 'Operating expenses. A null business_unit_id means the expense is global to Kerzie AI and later allocated.';
create index expenses_business_unit_date_idx on public.expenses (business_unit_id, expense_date desc);
create index expenses_global_date_idx on public.expenses (expense_date desc) where business_unit_id is null;

-- waterfall_config: tunable allocation rules for marketing, reserves, and other waterfall settings.
create table public.waterfall_config (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid references public.business_units(id) on delete cascade,
  config_key text not null,
  config_value numeric(12,4),
  effective_date date not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.waterfall_config is 'Effective-dated waterfall settings. Null business_unit_id means the value is the global default.';
comment on column public.waterfall_config.config_value is 'Numeric configuration value. Text-only business rules are documented in notes when needed.';
create index waterfall_config_lookup_idx on public.waterfall_config (business_unit_id, config_key, effective_date desc);
create index waterfall_config_global_lookup_idx on public.waterfall_config (config_key, effective_date desc) where business_unit_id is null;

-- capital_contributions: cash and sweat equity invested into a business unit by a partner.
create table public.capital_contributions (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  contribution_type public.contribution_type_enum not null,
  amount numeric(12,2) not null check (amount >= 0),
  hours numeric(10,2),
  hourly_rate numeric(12,2),
  contribution_date date not null,
  is_recoverable boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint capital_contributions_sweat_equity_check check (
    (contribution_type = 'cash' and hours is null and hourly_rate is null)
    or
    (contribution_type = 'sweat_equity' and hours is not null and hourly_rate is not null)
  )
);

comment on table public.capital_contributions is 'Records founder and partner capital contributions, including imputed sweat equity.';
create index capital_contributions_business_unit_idx on public.capital_contributions (business_unit_id, contribution_date desc);
create index capital_contributions_partner_idx on public.capital_contributions (partner_id, contribution_date desc);

-- scout_commissions: referral commissions owed to scouts after customer payment clears.
create table public.scout_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  customer_name text not null,
  contract_value numeric(12,2) not null check (contract_value >= 0),
  commission_percentage numeric(7,4) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  commission_amount numeric(12,2) generated always as (round((contract_value * commission_percentage) / 100, 2)) stored,
  customer_payment_date date not null,
  payout_date date generated always as (
    make_date(
      extract(year from (customer_payment_date + interval '1 month'))::int,
      extract(month from (customer_payment_date + interval '1 month'))::int,
      15
    )
  ) stored,
  status public.scout_commission_status_enum not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.scout_commissions is 'Referral commission ledger with payout dates set to the 15th of the month after customer payment.';
create index scout_commissions_partner_status_idx on public.scout_commissions (partner_id, status, payout_date);
create index scout_commissions_business_unit_idx on public.scout_commissions (business_unit_id, customer_payment_date desc);

-- marketing_contributions: partner-funded campaigns that may be recovered from future cash flows.
create table public.marketing_contributions (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  campaign_description text not null,
  contribution_date date not null,
  is_recovered boolean not null default false,
  recovery_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint marketing_contributions_recovery_check check (recovery_date is null or recovery_date >= contribution_date)
);

comment on table public.marketing_contributions is 'Tracks partner-funded marketing outlays and whether they have been repaid.';
create index marketing_contributions_business_unit_idx on public.marketing_contributions (business_unit_id, contribution_date desc);
create index marketing_contributions_partner_idx on public.marketing_contributions (partner_id, contribution_date desc);

-- proforma_scenarios: structured forecasting inputs for each business unit.
create table public.proforma_scenarios (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  scenario_name text not null,
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint proforma_scenarios_unique_name unique (business_unit_id, scenario_name)
);

comment on table public.proforma_scenarios is 'Forecast scenarios stored as JSON assumptions for pricing, tiers, costs, and subscriber counts.';
create index proforma_scenarios_assumptions_gin_idx on public.proforma_scenarios using gin (assumptions);

-- monthly_snapshots: persisted month-end waterfall outcomes per business unit.
create table public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  snapshot_month date not null check (snapshot_month = date_trunc('month', snapshot_month)::date),
  gross_revenue numeric(12,2) not null default 0 check (gross_revenue >= 0),
  platform_fees numeric(12,2) not null default 0 check (platform_fees >= 0),
  variable_costs numeric(12,2) not null default 0 check (variable_costs >= 0),
  ops_tax_allocated numeric(12,2) not null default 0 check (ops_tax_allocated >= 0),
  marketing_fund numeric(12,2) not null default 0 check (marketing_fund >= 0),
  operating_reserve numeric(12,2) not null default 0 check (operating_reserve >= 0),
  marketing_contributions_applied numeric(12,2) not null default 0 check (marketing_contributions_applied >= 0),
  distributable_pool numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monthly_snapshots_unique_month unique (business_unit_id, snapshot_month)
);

comment on table public.monthly_snapshots is 'Frozen monthly waterfall outputs used for reporting, payouts, and auditability.';
create index monthly_snapshots_business_unit_month_idx on public.monthly_snapshots (business_unit_id, snapshot_month desc);

-- payout_ledger: partner distributions generated from a monthly snapshot.
create table public.payout_ledger (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.monthly_snapshots(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete restrict,
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  gross_payout numeric(12,2) not null check (gross_payout >= 0),
  tax_reserve_note text,
  payout_date date,
  payment_method public.payment_method_enum,
  status public.ledger_status_enum not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.payout_ledger is 'Partner payout ledger tied back to a monthly snapshot.';
create index payout_ledger_snapshot_idx on public.payout_ledger (snapshot_id);
create index payout_ledger_partner_status_idx on public.payout_ledger (partner_id, status, payout_date);
create index payout_ledger_business_unit_idx on public.payout_ledger (business_unit_id, payout_date);

-- stakeholder_access_tokens: tokenized read access for stakeholder-facing reporting surfaces.
create table public.stakeholder_access_tokens (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  business_unit_ids uuid[] not null default '{}'::uuid[],
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.stakeholder_access_tokens is 'Scoped reporting tokens for stakeholders who need view-only business unit access.';
comment on column public.stakeholder_access_tokens.business_unit_ids is 'Array of business unit UUIDs the token can read.';
create index stakeholder_access_tokens_partner_idx on public.stakeholder_access_tokens (partner_id);
create index stakeholder_access_tokens_active_idx on public.stakeholder_access_tokens (is_active, expires_at);
create index stakeholder_access_tokens_business_units_gin_idx on public.stakeholder_access_tokens using gin (business_unit_ids);

-- Attach updated_at triggers to every mutable table.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_units',
    'partners',
    'partner_splits',
    'revenue_events',
    'expenses',
    'waterfall_config',
    'capital_contributions',
    'scout_commissions',
    'marketing_contributions',
    'proforma_scenarios',
    'monthly_snapshots',
    'payout_ledger',
    'stakeholder_access_tokens'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  end loop;
end
$$;

-- Seed core business units.
insert into public.business_units (name, slug, description)
values
  ('Kerzie AI', 'kerzie_ai', 'Parent operating unit for Kerzie Consulting LLC / Kerzie AI Solutions.'),
  ('Zorli', 'zorli', 'AI product and subscription business unit.'),
  ('GotaGuy', 'gotaguuy', 'GotaGuy operating unit. Slug mirrors the prompt-provided spelling.'),
  ('Unison', 'unison', 'Unison operating unit.'),
  ('Silver Moon', 'silver_moon', 'Revenue-sharing business unit for attributed Silver Moon sales.'),
  ('Silver Naturals', 'silver_naturals', 'Silver Naturals operating unit.');

-- Seed core stakeholders.
insert into public.partners (name, role)
values
  ('Wade Kerzie', 'owner'),
  ('Gavin Matthews', 'partner'),
  ('Hunter Pinnell', 'partner'),
  ('Gerry Brundage', 'client');

-- Seed effective-dated partner splits.
with split_seed as (
  select *
  from (
    values
      ('zorli', 'Wade Kerzie', 55.0000::numeric, null::text),
      ('zorli', 'Gavin Matthews', 25.0000::numeric, null::text),
      ('zorli', 'Hunter Pinnell', 20.0000::numeric, null::text),
      ('unison', 'Wade Kerzie', 50.0000::numeric, null::text),
      ('unison', 'Gavin Matthews', 50.0000::numeric, null::text),
      ('gotaguuy', 'Wade Kerzie', 80.0000::numeric, null::text),
      ('gotaguuy', 'Gavin Matthews', 20.0000::numeric, null::text),
      ('silver_moon', 'Wade Kerzie', 85.0000::numeric, 'Silver Moon distributable pool reflects Kerzie''s commission pool. Wade receives 85% of that pool.'),
      ('silver_moon', 'Gavin Matthews', 15.0000::numeric, 'Silver Moon distributable pool reflects Kerzie''s commission pool. Gavin receives the remaining 15% of that pool.'),
      ('kerzie_ai', 'Wade Kerzie', 80.0000::numeric, null::text),
      ('kerzie_ai', 'Gavin Matthews', 20.0000::numeric, null::text)
  ) as seed(slug, partner_name, percentage, notes)
)
insert into public.partner_splits (
  business_unit_id,
  partner_id,
  percentage,
  effective_date,
  end_date,
  notes
)
select
  bu.id,
  p.id,
  seed.percentage,
  current_date,
  null,
  seed.notes
from split_seed seed
join public.business_units bu on bu.slug = seed.slug
join public.partners p on p.name = seed.partner_name;

-- Seed recurring and placeholder expenses.
insert into public.expenses (
  business_unit_id,
  category,
  amount,
  description,
  vendor,
  expense_date,
  is_recurring,
  recurrence_interval
)
values
  (null, 'ops_tax', 297.00, 'GoHighLevel monthly subscription.', 'GHL', current_date, true, 'monthly'),
  (null, 'ops_tax', 24.00, 'Google Workspace for 2 seats at $12 per seat per month.', 'Google Workspace', current_date, true, 'monthly'),
  (null, 'ops_tax', 0.00, 'Vercel free tier placeholder.', 'Vercel', current_date, true, 'monthly'),
  (null, 'ops_tax', 15.00, 'Canva monthly subscription.', 'Canva', current_date, true, 'monthly'),
  (null, 'ops_tax', 0.00, 'OpenAI Codex fixed monthly seat cost placeholder for 2 seats. As of April 2, 2026, Codex-only seats have no fixed monthly fee and are billed by usage.', 'OpenAI Codex', current_date, true, 'monthly'),
  (null, 'ops_tax', 25.00, 'Supabase monthly subscription.', 'Supabase', current_date, true, 'monthly'),
  ((select id from public.business_units where slug = 'gotaguuy'), 'variable', 0.00, 'Twilio variable usage placeholder. Replace monthly with actual spend.', 'Twilio', current_date, true, 'monthly'),
  ((select id from public.business_units where slug = 'zorli'), 'variable', 0.00, 'OpenAI API variable usage placeholder. Replace monthly with actual spend.', 'OpenAI API', current_date, true, 'monthly');

-- Seed default waterfall settings.
insert into public.waterfall_config (
  business_unit_id,
  config_key,
  config_value,
  effective_date,
  notes
)
values
  (null, 'marketing_fund_percentage', 10.0000, current_date, 'Global default marketing set-aside percentage.'),
  (null, 'operating_reserve_percentage', 12.0000, current_date, 'Global default operating reserve percentage.'),
  (null, 'ops_tax_method', null, current_date, 'actual: pull real recurring costs rather than applying a percentage. config_value remains null because this table stores numeric values.');

-- Seed founder capital and sweat equity.
insert into public.capital_contributions (
  business_unit_id,
  partner_id,
  contribution_type,
  amount,
  hours,
  hourly_rate,
  contribution_date,
  is_recoverable,
  notes
)
values
  (
    (select id from public.business_units where slug = 'zorli'),
    (select id from public.partners where name = 'Wade Kerzie'),
    'cash',
    3000.00,
    null,
    null,
    current_date,
    false,
    'Founder capital, pre-launch development'
  ),
  (
    (select id from public.business_units where slug = 'zorli'),
    (select id from public.partners where name = 'Wade Kerzie'),
    'sweat_equity',
    45000.00,
    300.00,
    150.00,
    current_date,
    false,
    'Development and architecture, pre-launch'
  ),
  (
    (select id from public.business_units where slug = 'zorli'),
    (select id from public.partners where name = 'Gavin Matthews'),
    'sweat_equity',
    30000.00,
    200.00,
    150.00,
    current_date,
    false,
    'Development contribution, pre-launch'
  );

-- v_monthly_waterfall: one row per business unit and month, combining raw activity, config, and stored snapshots.
create or replace view public.v_monthly_waterfall
with (security_invoker = true)
as
with revenue_months as (
  select
    re.business_unit_id,
    date_trunc('month', re.transaction_date)::date as snapshot_month,
    round(sum(re.gross_amount), 2) as gross_revenue,
    round(sum(re.platform_fee_amount), 2) as platform_fees,
    round(sum(re.net_after_platform), 2) as net_after_platform
  from public.revenue_events re
  group by re.business_unit_id, date_trunc('month', re.transaction_date)::date
),
unit_expense_months as (
  select
    e.business_unit_id,
    date_trunc('month', e.expense_date)::date as snapshot_month,
    round(sum(case when e.category = 'variable' then e.amount else 0 end), 2) as unit_variable_costs,
    round(sum(case when e.category = 'ops_tax' then e.amount else 0 end), 2) as unit_ops_tax_costs,
    round(sum(case when e.category = 'marketing' then e.amount else 0 end), 2) as unit_marketing_costs,
    round(sum(case when e.category = 'reserve' then e.amount else 0 end), 2) as unit_reserve_costs,
    round(sum(case when e.category = 'capital' then e.amount else 0 end), 2) as unit_capital_costs,
    round(sum(case when e.category = 'one_time' then e.amount else 0 end), 2) as unit_one_time_costs
  from public.expenses e
  where e.business_unit_id is not null
  group by e.business_unit_id, date_trunc('month', e.expense_date)::date
),
global_expense_months as (
  select
    date_trunc('month', e.expense_date)::date as snapshot_month,
    round(sum(case when e.category = 'variable' then e.amount else 0 end), 2) as global_variable_costs,
    round(sum(case when e.category = 'ops_tax' then e.amount else 0 end), 2) as global_ops_tax_costs,
    round(sum(case when e.category = 'marketing' then e.amount else 0 end), 2) as global_marketing_costs,
    round(sum(case when e.category = 'reserve' then e.amount else 0 end), 2) as global_reserve_costs,
    round(sum(case when e.category = 'capital' then e.amount else 0 end), 2) as global_capital_costs,
    round(sum(case when e.category = 'one_time' then e.amount else 0 end), 2) as global_one_time_costs
  from public.expenses e
  where e.business_unit_id is null
  group by date_trunc('month', e.expense_date)::date
),
month_keys as (
  select business_unit_id, snapshot_month from public.monthly_snapshots
  union
  select business_unit_id, snapshot_month from revenue_months
  union
  select business_unit_id, snapshot_month from unit_expense_months
)
select
  mk.business_unit_id,
  bu.name as business_unit_name,
  bu.slug as business_unit_slug,
  mk.snapshot_month,
  coalesce(rm.gross_revenue, 0.00) as gross_revenue,
  coalesce(rm.platform_fees, 0.00) as platform_fees,
  coalesce(rm.net_after_platform, 0.00) as net_after_platform,
  coalesce(uem.unit_variable_costs, 0.00) as actual_unit_variable_costs,
  coalesce(uem.unit_ops_tax_costs, 0.00) as actual_unit_ops_tax_costs,
  coalesce(uem.unit_marketing_costs, 0.00) as actual_unit_marketing_costs,
  coalesce(uem.unit_reserve_costs, 0.00) as actual_unit_reserve_costs,
  coalesce(uem.unit_capital_costs, 0.00) as actual_unit_capital_costs,
  coalesce(uem.unit_one_time_costs, 0.00) as actual_unit_one_time_costs,
  coalesce(gem.global_variable_costs, 0.00) as global_variable_costs,
  coalesce(gem.global_ops_tax_costs, 0.00) as global_ops_tax_costs,
  coalesce(gem.global_marketing_costs, 0.00) as global_marketing_costs,
  coalesce(gem.global_reserve_costs, 0.00) as global_reserve_costs,
  coalesce(gem.global_capital_costs, 0.00) as global_capital_costs,
  coalesce(gem.global_one_time_costs, 0.00) as global_one_time_costs,
  coalesce(unit_marketing_config.config_value, global_marketing_config.config_value, 0.00) as marketing_fund_percentage,
  coalesce(unit_reserve_config.config_value, global_reserve_config.config_value, 0.00) as operating_reserve_percentage,
  coalesce(unit_ops_tax_config.notes, global_ops_tax_config.notes, 'actual') as ops_tax_method,
  coalesce(ms.variable_costs, 0.00) as snapshot_variable_costs,
  coalesce(ms.ops_tax_allocated, 0.00) as snapshot_ops_tax_allocated,
  coalesce(ms.marketing_fund, 0.00) as snapshot_marketing_fund,
  coalesce(ms.operating_reserve, 0.00) as snapshot_operating_reserve,
  coalesce(ms.marketing_contributions_applied, 0.00) as snapshot_marketing_contributions_applied,
  coalesce(ms.distributable_pool, 0.00) as snapshot_distributable_pool
from month_keys mk
join public.business_units bu on bu.id = mk.business_unit_id
left join revenue_months rm
  on rm.business_unit_id = mk.business_unit_id
 and rm.snapshot_month = mk.snapshot_month
left join unit_expense_months uem
  on uem.business_unit_id = mk.business_unit_id
 and uem.snapshot_month = mk.snapshot_month
left join global_expense_months gem
  on gem.snapshot_month = mk.snapshot_month
left join public.monthly_snapshots ms
  on ms.business_unit_id = mk.business_unit_id
 and ms.snapshot_month = mk.snapshot_month
left join lateral (
  select wc.config_value
  from public.waterfall_config wc
  where wc.business_unit_id = mk.business_unit_id
    and wc.config_key = 'marketing_fund_percentage'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) unit_marketing_config on true
left join lateral (
  select wc.config_value
  from public.waterfall_config wc
  where wc.business_unit_id is null
    and wc.config_key = 'marketing_fund_percentage'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) global_marketing_config on true
left join lateral (
  select wc.config_value
  from public.waterfall_config wc
  where wc.business_unit_id = mk.business_unit_id
    and wc.config_key = 'operating_reserve_percentage'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) unit_reserve_config on true
left join lateral (
  select wc.config_value
  from public.waterfall_config wc
  where wc.business_unit_id is null
    and wc.config_key = 'operating_reserve_percentage'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) global_reserve_config on true
left join lateral (
  select wc.notes
  from public.waterfall_config wc
  where wc.business_unit_id = mk.business_unit_id
    and wc.config_key = 'ops_tax_method'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) unit_ops_tax_config on true
left join lateral (
  select wc.notes
  from public.waterfall_config wc
  where wc.business_unit_id is null
    and wc.config_key = 'ops_tax_method'
    and wc.effective_date <= mk.snapshot_month
  order by wc.effective_date desc
  limit 1
) global_ops_tax_config on true;

comment on view public.v_monthly_waterfall is 'Month-level waterfall reporting view joining revenue, expenses, config, and persisted snapshot outputs.';

-- v_partner_payouts: partner-facing payout history with month and unit context.
create or replace view public.v_partner_payouts
with (security_invoker = true)
as
select
  pl.id as payout_ledger_id,
  pl.snapshot_id,
  ms.snapshot_month,
  pl.business_unit_id,
  bu.name as business_unit_name,
  bu.slug as business_unit_slug,
  pl.partner_id,
  p.name as partner_name,
  p.role as partner_role,
  pl.gross_payout,
  pl.tax_reserve_note,
  pl.payout_date,
  pl.payment_method,
  pl.status,
  sum(pl.gross_payout) over (partition by pl.partner_id, pl.status) as partner_status_total,
  sum(pl.gross_payout) over (partition by pl.partner_id) as partner_lifetime_total
from public.payout_ledger pl
join public.partners p on p.id = pl.partner_id
join public.business_units bu on bu.id = pl.business_unit_id
join public.monthly_snapshots ms on ms.id = pl.snapshot_id;

comment on view public.v_partner_payouts is 'Partner distribution ledger with business-unit and snapshot context for pending and paid payouts.';

-- v_zorli_unit_economics: subscriber-tier economics derived from pro forma assumptions.
create or replace view public.v_zorli_unit_economics
with (security_invoker = true)
as
with zorli_scenarios as (
  select
    ps.id as scenario_id,
    ps.scenario_name,
    ps.assumptions,
    bu.id as business_unit_id,
    bu.name as business_unit_name
  from public.proforma_scenarios ps
  join public.business_units bu on bu.id = ps.business_unit_id
  where bu.slug = 'zorli'
),
tier_inputs as (
  select
    zs.scenario_id,
    zs.scenario_name,
    zs.business_unit_id,
    zs.business_unit_name,
    coalesce((zs.assumptions ->> 'apple_cut_percentage')::numeric, 15.0000) as apple_cut_percentage,
    tier.value as tier_assumptions
  from zorli_scenarios zs
  cross join lateral jsonb_array_elements(coalesce(zs.assumptions -> 'tiers', '[]'::jsonb)) as tier(value)
)
select
  ti.scenario_id,
  ti.scenario_name,
  ti.business_unit_id,
  ti.business_unit_name,
  coalesce(ti.tier_assumptions ->> 'tier_name', ti.tier_assumptions ->> 'name', 'Unnamed Tier') as subscriber_tier,
  coalesce((ti.tier_assumptions ->> 'subscribers')::numeric, 0) as subscriber_count,
  coalesce((ti.tier_assumptions ->> 'price')::numeric, 0) as revenue_per_subscriber,
  ti.apple_cut_percentage,
  round(coalesce((ti.tier_assumptions ->> 'price')::numeric, 0) * (ti.apple_cut_percentage / 100), 2) as apple_cut_per_subscriber,
  round(coalesce((ti.tier_assumptions ->> 'llm_cost_per_user')::numeric, 0), 2) as llm_cost_per_user,
  round(coalesce((ti.tier_assumptions ->> 'allocated_ops_tax_per_user')::numeric, 0), 2) as allocated_ops_tax_per_user,
  round(
    coalesce((ti.tier_assumptions ->> 'price')::numeric, 0)
    - (coalesce((ti.tier_assumptions ->> 'price')::numeric, 0) * (ti.apple_cut_percentage / 100))
    - coalesce((ti.tier_assumptions ->> 'llm_cost_per_user')::numeric, 0)
    - coalesce((ti.tier_assumptions ->> 'allocated_ops_tax_per_user')::numeric, 0),
    2
  ) as net_distributable_per_subscriber,
  round(
    coalesce((ti.tier_assumptions ->> 'subscribers')::numeric, 0)
    * (
      coalesce((ti.tier_assumptions ->> 'price')::numeric, 0)
      - (coalesce((ti.tier_assumptions ->> 'price')::numeric, 0) * (ti.apple_cut_percentage / 100))
      - coalesce((ti.tier_assumptions ->> 'llm_cost_per_user')::numeric, 0)
      - coalesce((ti.tier_assumptions ->> 'allocated_ops_tax_per_user')::numeric, 0)
    ),
    2
  ) as total_net_distributable
from tier_inputs ti;

comment on view public.v_zorli_unit_economics is 'Per-tier Zorli unit economics derived from pro forma JSON assumptions, assuming the Apple Small Business rate defaults to 15%.';

-- v_silver_moon_attribution: attributed Silver Moon economics using the seeded Kerzie/Wade/Gavin logic.
create or replace view public.v_silver_moon_attribution
with (security_invoker = true)
as
select
  re.id as revenue_event_id,
  re.transaction_date,
  re.description,
  re.source,
  re.gross_amount as gross_sales,
  round(re.gross_amount * 0.15, 2) as kerzie_gross_fee,
  round(re.gross_amount * 0.85, 2) as wade_base_net_before_gavin,
  round(re.gross_amount * 0.1275, 2) as gavin_net,
  round(re.gross_amount * 0.7225, 2) as wade_net,
  'Implements the seeded Silver Moon rule: Gavin receives 15% of Wade''s 85% post-Kerzie net share.'::text as formula_note
from public.revenue_events re
join public.business_units bu on bu.id = re.business_unit_id
where bu.slug = 'silver_moon'
  and re.is_attributed = true;

comment on view public.v_silver_moon_attribution is 'Attributed Silver Moon sales with Kerzie fee, Gavin carve-out, and Wade retained net calculated from gross revenue.';

-- v_scout_commission_ledger: scout commission rows with grouped running totals by scout and status.
create or replace view public.v_scout_commission_ledger
with (security_invoker = true)
as
select
  sc.id as scout_commission_id,
  sc.partner_id,
  p.name as scout_name,
  sc.business_unit_id,
  bu.name as business_unit_name,
  bu.slug as business_unit_slug,
  sc.customer_name,
  sc.contract_value,
  sc.commission_percentage,
  sc.commission_amount,
  sc.customer_payment_date,
  sc.payout_date,
  sc.status,
  count(*) over (partition by sc.partner_id, sc.status) as scout_status_count,
  sum(sc.commission_amount) over (partition by sc.partner_id, sc.status) as scout_status_total,
  sum(sc.commission_amount) over (partition by sc.partner_id) as scout_lifetime_total
from public.scout_commissions sc
join public.partners p on p.id = sc.partner_id
join public.business_units bu on bu.id = sc.business_unit_id;

comment on view public.v_scout_commission_ledger is 'Scout commission ledger with payout dates and grouped totals by scout and status.';

-- Enable Row Level Security everywhere now; policies will be added later.
alter table public.business_units enable row level security;
alter table public.partners enable row level security;
alter table public.partner_splits enable row level security;
alter table public.revenue_events enable row level security;
alter table public.expenses enable row level security;
alter table public.waterfall_config enable row level security;
alter table public.capital_contributions enable row level security;
alter table public.scout_commissions enable row level security;
alter table public.marketing_contributions enable row level security;
alter table public.proforma_scenarios enable row level security;
alter table public.monthly_snapshots enable row level security;
alter table public.payout_ledger enable row level security;
alter table public.stakeholder_access_tokens enable row level security;

commit;

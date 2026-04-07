-- Scout commission tracking expansion
-- Adds dedicated scout records, contract tracking, and richer commission lineage.

begin;

create type public.customer_contract_status_enum as enum ('active', 'cancelled', 'paused');

create table public.scouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid unique references public.partners(id) on delete set null,
  name text not null,
  email text,
  phone text,
  region text,
  is_active boolean not null default true,
  onboard_date date not null default current_date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.scouts is 'Field reps and independent 1099 scouts who originate customer contracts.';
comment on column public.scouts.partner_id is 'Optional link back to partners for payout/accounting continuity.';
create unique index scouts_email_unique_idx on public.scouts (lower(email)) where email is not null;
create index scouts_active_region_idx on public.scouts (is_active, region);

create table public.scout_products (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  commission_percentage numeric(7,4) not null check (commission_percentage >= 0 and commission_percentage <= 100),
  effective_date date not null,
  end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scout_products_date_order check (end_date is null or end_date >= effective_date),
  constraint scout_products_unique_effective unique (scout_id, business_unit_id, effective_date)
);

comment on table public.scout_products is 'Effective-dated commission plans showing what each scout earns on each business unit.';
create index scout_products_lookup_idx on public.scout_products (scout_id, business_unit_id, effective_date desc);
create index scout_products_business_unit_idx on public.scout_products (business_unit_id, effective_date desc);

create table public.customer_contracts (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete restrict,
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  customer_name text not null,
  customer_email text,
  contract_start_date date not null,
  monthly_value numeric(12,2) not null check (monthly_value >= 0),
  contract_term_months integer not null check (contract_term_months > 0),
  status public.customer_contract_status_enum not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.customer_contracts is 'Monthly customer contracts originated by scouts and tied to a Kerzie business unit.';
create index customer_contracts_scout_status_idx on public.customer_contracts (scout_id, status, contract_start_date desc);
create index customer_contracts_business_unit_idx on public.customer_contracts (business_unit_id, status, contract_start_date desc);
create unique index customer_contracts_customer_unique_idx
  on public.customer_contracts (scout_id, business_unit_id, lower(customer_name), contract_start_date);

alter table public.scout_commissions
  add column customer_contract_id uuid references public.customer_contracts(id) on delete set null,
  add column month_number integer not null default 1 check (month_number > 0);

comment on column public.scout_commissions.customer_contract_id is 'Source contract that generated this commission event.';
comment on column public.scout_commissions.month_number is 'Which month of the contract generated the commission.';
create index scout_commissions_contract_idx on public.scout_commissions (customer_contract_id, month_number);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_scouts_updated_at') then
    create trigger set_scouts_updated_at
    before update on public.scouts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_scout_products_updated_at') then
    create trigger set_scout_products_updated_at
    before update on public.scout_products
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_customer_contracts_updated_at') then
    create trigger set_customer_contracts_updated_at
    before update on public.customer_contracts
    for each row execute function public.set_updated_at();
  end if;
end
$$;

create or replace view public.v_scout_commission_ledger
with (security_invoker = true)
as
select
  sc.id as scout_commission_id,
  sc.partner_id,
  cc.scout_id,
  coalesce(s.name, p.name, 'Unknown scout') as scout_name,
  sc.business_unit_id,
  bu.name as business_unit_name,
  bu.slug as business_unit_slug,
  sc.customer_contract_id,
  sc.month_number,
  sc.customer_name,
  cc.customer_email,
  sc.contract_value,
  sc.commission_percentage,
  sc.commission_amount,
  sc.customer_payment_date,
  sc.payout_date,
  sc.status,
  count(*) over (partition by coalesce(cc.scout_id::text, sc.partner_id::text), sc.status) as scout_status_count,
  sum(sc.commission_amount) over (partition by coalesce(cc.scout_id::text, sc.partner_id::text), sc.status) as scout_status_total,
  sum(sc.commission_amount) over (partition by coalesce(cc.scout_id::text, sc.partner_id::text)) as scout_lifetime_total
from public.scout_commissions sc
left join public.customer_contracts cc on cc.id = sc.customer_contract_id
left join public.scouts s on s.id = cc.scout_id
left join public.partners p on p.id = sc.partner_id
join public.business_units bu on bu.id = sc.business_unit_id;

comment on view public.v_scout_commission_ledger is 'Scout commission ledger with contract lineage and grouped totals by scout and status.';

alter table public.scouts enable row level security;
alter table public.scout_products enable row level security;
alter table public.customer_contracts enable row level security;

commit;

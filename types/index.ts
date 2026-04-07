export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PartnerRole = "owner" | "partner" | "contractor" | "client";
export type RevenueSource = "stripe" | "ach" | "check" | "manual";
export type ManualRevenueType = "recurring" | "one_time" | "setup_fee" | "commission";
export type ExpenseCategory = "ops_tax" | "marketing" | "reserve" | "variable" | "capital" | "one_time";
export type RecurrenceInterval = "monthly" | "annual" | "one_time";
export type ContributionType = "cash" | "sweat_equity";
export type ScoutCommissionStatus = "pending" | "paid" | "held";
export type CustomerContractStatus = "active" | "cancelled" | "paused";
export type PaymentMethod = "ach" | "check" | "stripe" | "cash";
export type LedgerStatus = "pending" | "paid";
export type RevenueReviewStatus = "unreviewed" | "confirmed" | "flagged";
export type ConsultingProjectStatus = "active" | "complete" | "paused";
export type StripeWebhookEventSource = "webhook" | "sync" | "retry";
export type StripeWebhookEventStatus = "received" | "processed" | "failed" | "ignored";

export interface BusinessUnit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  name: string;
  email: string | null;
  role: PartnerRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerSplit {
  id: string;
  business_unit_id: string;
  partner_id: string;
  percentage: number;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueEvent {
  id: string;
  business_unit_id: string;
  source: RevenueSource;
  revenue_type: ManualRevenueType;
  gross_amount: number;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  net_after_platform: number;
  transaction_date: string;
  description: string | null;
  payment_method: PaymentMethod | null;
  customer_name: string | null;
  stripe_payment_id: string | null;
  invoice_number: string | null;
  notes: string | null;
  is_attributed: boolean;
  is_setup_fee: boolean;
  is_pending_agreement: boolean;
  review_status: RevenueReviewStatus;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  business_unit_id: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string;
  vendor: string | null;
  expense_date: string;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval;
  receipt_url: string | null;
  is_active: boolean;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterfallConfig {
  id: string;
  business_unit_id: string | null;
  config_key: string;
  config_value: number | null;
  effective_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CapitalContribution {
  id: string;
  business_unit_id: string;
  partner_id: string;
  contribution_type: ContributionType;
  amount: number;
  hours: number | null;
  hourly_rate: number | null;
  contribution_date: string;
  is_recoverable: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scout {
  id: string;
  partner_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  region: string | null;
  is_active: boolean;
  onboard_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoutProduct {
  id: string;
  scout_id: string;
  business_unit_id: string;
  commission_percentage: number;
  effective_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerContract {
  id: string;
  scout_id: string;
  business_unit_id: string;
  customer_name: string;
  customer_email: string | null;
  contract_start_date: string;
  monthly_value: number;
  contract_term_months: number;
  status: CustomerContractStatus;
  created_at: string;
  updated_at: string;
}

export interface ScoutCommission {
  id: string;
  partner_id: string;
  business_unit_id: string;
  customer_contract_id: string | null;
  month_number: number;
  customer_name: string;
  contract_value: number;
  commission_percentage: number;
  commission_amount: number;
  customer_payment_date: string;
  payout_date: string;
  status: ScoutCommissionStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketingContribution {
  id: string;
  business_unit_id: string;
  partner_id: string;
  amount: number;
  campaign_description: string;
  contribution_date: string;
  is_recovered: boolean;
  recovery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProformaScenario {
  id: string;
  business_unit_id: string;
  scenario_name: string;
  assumptions: Json;
  created_at: string;
  updated_at: string;
}

export interface MonthlySnapshot {
  id: string;
  business_unit_id: string;
  snapshot_month: string;
  gross_revenue: number;
  platform_fees: number;
  variable_costs: number;
  ops_tax_allocated: number;
  marketing_fund: number;
  operating_reserve: number;
  marketing_contributions_applied: number;
  setup_fee_revenue: number;
  setup_fee_distributable_pool: number;
  distributable_pool: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultingProject {
  id: string;
  business_unit_id: string;
  project_name: string;
  client_name: string;
  project_value: number;
  start_date: string;
  end_date: string | null;
  status: ConsultingProjectStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingProjectPayment {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  description: string | null;
  invoice_number: string | null;
  notes: string | null;
  revenue_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyClose {
  id: string;
  close_month: string;
  revenue_review_completed: boolean;
  recurring_expenses_confirmed: boolean;
  commissions_review_completed: boolean;
  snapshot_generated: boolean;
  payouts_calculated: boolean;
  pdf_exported: boolean;
  is_locked: boolean;
  locked_at: string | null;
  locked_by_email: string | null;
  anomaly_notes: string | null;
  admin_override_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutLedger {
  id: string;
  snapshot_id: string;
  partner_id: string;
  business_unit_id: string;
  gross_payout: number;
  tax_reserve_note: string | null;
  payout_date: string | null;
  payment_method: PaymentMethod | null;
  status: LedgerStatus;
  created_at: string;
  updated_at: string;
}

export interface StakeholderAccessToken {
  id: string;
  partner_id: string;
  token: string;
  business_unit_ids: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SilverMoonExistingCustomer {
  id: string;
  email: string;
  name: string | null;
  first_purchase_date: string;
  notes: string | null;
  created_at: string;
}

export interface StripeWebhookEvent {
  id: string;
  stripe_event_id: string;
  stripe_account_id: string | null;
  event_type: string;
  payment_id: string | null;
  source: StripeWebhookEventSource;
  status: StripeWebhookEventStatus;
  received_at: string;
  processed_at: string | null;
  last_error: string | null;
  payload: Json;
  created_at: string;
  updated_at: string;
}

export interface MonthlyWaterfallView {
  business_unit_id: string;
  business_unit_name: string;
  business_unit_slug: string;
  snapshot_month: string;
  gross_revenue: number;
  platform_fees: number;
  net_after_platform: number;
  actual_unit_variable_costs: number;
  actual_unit_ops_tax_costs: number;
  actual_unit_marketing_costs: number;
  actual_unit_reserve_costs: number;
  actual_unit_capital_costs: number;
  actual_unit_one_time_costs: number;
  global_variable_costs: number;
  global_ops_tax_costs: number;
  global_marketing_costs: number;
  global_reserve_costs: number;
  global_capital_costs: number;
  global_one_time_costs: number;
  marketing_fund_percentage: number;
  operating_reserve_percentage: number;
  ops_tax_method: string;
  snapshot_variable_costs: number;
  snapshot_ops_tax_allocated: number;
  snapshot_marketing_fund: number;
  snapshot_operating_reserve: number;
  snapshot_marketing_contributions_applied: number;
  snapshot_distributable_pool: number;
}

export interface PartnerPayoutView {
  payout_ledger_id: string;
  snapshot_id: string;
  snapshot_month: string;
  business_unit_id: string;
  business_unit_name: string;
  business_unit_slug: string;
  partner_id: string;
  partner_name: string;
  partner_role: PartnerRole;
  gross_payout: number;
  tax_reserve_note: string | null;
  payout_date: string | null;
  payment_method: PaymentMethod | null;
  status: LedgerStatus;
  partner_status_total: number;
  partner_lifetime_total: number;
}

export interface ZorliUnitEconomicsView {
  scenario_id: string;
  scenario_name: string;
  business_unit_id: string;
  business_unit_name: string;
  subscriber_tier: string;
  subscriber_count: number;
  revenue_per_subscriber: number;
  apple_cut_percentage: number;
  apple_cut_per_subscriber: number;
  llm_cost_per_user: number;
  allocated_ops_tax_per_user: number;
  net_distributable_per_subscriber: number;
  total_net_distributable: number;
}

export interface SilverMoonAttributionView {
  revenue_event_id: string;
  transaction_date: string;
  description: string | null;
  source: RevenueSource;
  gross_sales: number;
  kerzie_gross_fee: number;
  wade_base_net_before_gavin: number;
  gavin_net: number;
  wade_net: number;
  formula_note: string;
}

export interface ScoutCommissionLedgerView {
  scout_commission_id: string;
  partner_id: string;
  scout_id: string | null;
  scout_name: string;
  business_unit_id: string;
  business_unit_name: string;
  business_unit_slug: string;
  customer_contract_id: string | null;
  month_number: number;
  customer_name: string;
  customer_email: string | null;
  contract_value: number;
  commission_percentage: number;
  commission_amount: number;
  customer_payment_date: string;
  payout_date: string;
  status: ScoutCommissionStatus;
  scout_status_count: number;
  scout_status_total: number;
  scout_lifetime_total: number;
}

export type BusinessUnitInsert = Omit<BusinessUnit, "id" | "created_at" | "updated_at">;
export type PartnerInsert = Omit<Partner, "id" | "created_at" | "updated_at">;
export type PartnerSplitInsert = Omit<PartnerSplit, "id" | "created_at" | "updated_at">;
export type RevenueEventInsert = Omit<
  RevenueEvent,
  "id" | "platform_fee_amount" | "net_after_platform" | "created_at" | "updated_at"
>;
export type ExpenseInsert = Omit<Expense, "id" | "created_at" | "updated_at">;
export type WaterfallConfigInsert = Omit<WaterfallConfig, "id" | "created_at" | "updated_at">;
export type CapitalContributionInsert = Omit<CapitalContribution, "id" | "created_at" | "updated_at">;
export type ScoutInsert = Omit<Scout, "id" | "created_at" | "updated_at">;
export type ScoutProductInsert = Omit<ScoutProduct, "id" | "created_at" | "updated_at">;
export type CustomerContractInsert = Omit<CustomerContract, "id" | "created_at" | "updated_at">;
export type ScoutCommissionInsert = Omit<
  ScoutCommission,
  "id" | "commission_amount" | "payout_date" | "created_at" | "updated_at"
>;
export type MarketingContributionInsert = Omit<MarketingContribution, "id" | "created_at" | "updated_at">;
export type ProformaScenarioInsert = Omit<ProformaScenario, "id" | "created_at" | "updated_at">;
export type MonthlySnapshotInsert = Omit<MonthlySnapshot, "id" | "created_at" | "updated_at">;
export type PayoutLedgerInsert = Omit<PayoutLedger, "id" | "created_at" | "updated_at">;
export type StakeholderAccessTokenInsert = Omit<StakeholderAccessToken, "id" | "token" | "created_at" | "updated_at">;
export type ConsultingProjectInsert = Omit<ConsultingProject, "id" | "created_at" | "updated_at">;
export type ConsultingProjectPaymentInsert = Omit<ConsultingProjectPayment, "id" | "created_at" | "updated_at">;
export type MonthlyCloseInsert = Omit<MonthlyClose, "id" | "created_at" | "updated_at">;
export type SilverMoonExistingCustomerInsert = Omit<SilverMoonExistingCustomer, "id" | "created_at">;
export type StripeWebhookEventInsert = Omit<StripeWebhookEvent, "id" | "received_at" | "created_at" | "updated_at">;

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ViewDefinition<Row> = {
  Row: Row;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      business_units: TableDefinition<BusinessUnit, BusinessUnitInsert, Partial<BusinessUnitInsert>>;
      partners: TableDefinition<Partner, PartnerInsert, Partial<PartnerInsert>>;
      partner_splits: TableDefinition<PartnerSplit, PartnerSplitInsert, Partial<PartnerSplitInsert>>;
      revenue_events: TableDefinition<RevenueEvent, RevenueEventInsert, Partial<RevenueEventInsert>>;
      expenses: TableDefinition<Expense, ExpenseInsert, Partial<ExpenseInsert>>;
      waterfall_config: TableDefinition<WaterfallConfig, WaterfallConfigInsert, Partial<WaterfallConfigInsert>>;
      capital_contributions: TableDefinition<
        CapitalContribution,
        CapitalContributionInsert,
        Partial<CapitalContributionInsert>
      >;
      scouts: TableDefinition<Scout, ScoutInsert, Partial<ScoutInsert>>;
      scout_products: TableDefinition<ScoutProduct, ScoutProductInsert, Partial<ScoutProductInsert>>;
      customer_contracts: TableDefinition<CustomerContract, CustomerContractInsert, Partial<CustomerContractInsert>>;
      scout_commissions: TableDefinition<
        ScoutCommission,
        ScoutCommissionInsert,
        Partial<ScoutCommissionInsert>
      >;
      marketing_contributions: TableDefinition<
        MarketingContribution,
        MarketingContributionInsert,
        Partial<MarketingContributionInsert>
      >;
      proforma_scenarios: TableDefinition<ProformaScenario, ProformaScenarioInsert, Partial<ProformaScenarioInsert>>;
      monthly_snapshots: TableDefinition<MonthlySnapshot, MonthlySnapshotInsert, Partial<MonthlySnapshotInsert>>;
      payout_ledger: TableDefinition<PayoutLedger, PayoutLedgerInsert, Partial<PayoutLedgerInsert>>;
      stakeholder_access_tokens: TableDefinition<
        StakeholderAccessToken,
        StakeholderAccessTokenInsert,
        Partial<StakeholderAccessTokenInsert>
      >;
      consulting_projects: TableDefinition<
        ConsultingProject,
        ConsultingProjectInsert,
        Partial<ConsultingProjectInsert>
      >;
      consulting_project_payments: TableDefinition<
        ConsultingProjectPayment,
        ConsultingProjectPaymentInsert,
        Partial<ConsultingProjectPaymentInsert>
      >;
      monthly_closes: TableDefinition<MonthlyClose, MonthlyCloseInsert, Partial<MonthlyCloseInsert>>;
      silver_moon_existing_customers: TableDefinition<
        SilverMoonExistingCustomer,
        SilverMoonExistingCustomerInsert,
        Partial<SilverMoonExistingCustomerInsert>
      >;
      stripe_webhook_events: TableDefinition<
        StripeWebhookEvent,
        StripeWebhookEventInsert,
        Partial<StripeWebhookEventInsert>
      >;
    };
    Views: {
      v_monthly_waterfall: ViewDefinition<MonthlyWaterfallView>;
      v_partner_payouts: ViewDefinition<PartnerPayoutView>;
      v_zorli_unit_economics: ViewDefinition<ZorliUnitEconomicsView>;
      v_silver_moon_attribution: ViewDefinition<SilverMoonAttributionView>;
      v_scout_commission_ledger: ViewDefinition<ScoutCommissionLedgerView>;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

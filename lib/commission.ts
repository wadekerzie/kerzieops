type Cents = bigint;

interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

export interface CommissionCalculationInput {
  contractValue: number;
  commissionPercentage: number;
  customerPaymentDate: string | Date;
}

export interface CustomerContract {
  id: string;
  scoutId: string;
  scoutName: string;
  partnerId?: string | null;
  businessUnitId: string;
  productName: string;
  customerName: string;
  customerEmail?: string | null;
  contractStartDate: string | Date;
  monthlyValue: number;
  contractTermMonths: number;
  status: "active" | "cancelled" | "paused";
  commissionPercentage: number;
}

export interface CommissionEvent {
  customerContractId: string;
  monthNumber: number;
  scoutId: string;
  scoutName: string;
  partnerId: string | null;
  businessUnitId: string;
  productName: string;
  customerName: string;
  customerEmail: string | null;
  monthlyContractValue: number;
  commissionPercentage: number;
  commissionAmount: number;
  customerPaymentDate: string;
  payoutDate: string;
  status: "pending";
}

export interface CommissionPayoutGroup {
  payoutDate: string;
  subtotal: number;
  commissions: CommissionEvent[];
}

export interface CommissionBatch {
  paymentDate: string;
  totalCommissionAmount: number;
  totalCommissionCount: number;
  payouts: CommissionPayoutGroup[];
}

export interface PayoutSchedule {
  paymentDate: string;
  payoutDate: string;
  totalCommissionAmount: number;
  totalCommissionCount: number;
  commissions: CommissionEvent[];
}

function parseDecimal(value: number, label: string): Fraction {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  const negative = value < 0;
  const absolute = negative ? -value : value;
  const stringValue = Number.isInteger(absolute)
    ? absolute.toString()
    : absolute.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  const [wholePart, fractionalPart = ""] = stringValue.split(".");
  const digits = `${wholePart}${fractionalPart}`.replace(/^0+(?=\d)/, "") || "0";

  return {
    numerator: BigInt(digits) * (negative ? -1n : 1n),
    denominator: 10n ** BigInt(fractionalPart.length)
  };
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new Error("Cannot divide by zero.");
  }

  const negative = (numerator < 0n) !== (denominator < 0n);
  const absoluteNumerator = numerator < 0n ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const rounded = (absoluteNumerator + absoluteDenominator / 2n) / absoluteDenominator;

  return negative ? -rounded : rounded;
}

function toCents(amount: number, label: string): Cents {
  const fraction = parseDecimal(amount, label);

  return roundDivide(fraction.numerator * 100n, fraction.denominator);
}

function centsToNumber(amount: Cents): number {
  return Number(amount) / 100;
}

function normalizeRate(value: number, label: string): Fraction {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number.`);
  }

  const fraction = parseDecimal(value, label);

  if (value === 1) {
    return fraction;
  }

  if (value > 1) {
    return {
      numerator: fraction.numerator,
      denominator: fraction.denominator * 100n
    };
  }

  return fraction;
}

function multiplyCentsByRate(amountCents: Cents, rate: Fraction): Cents {
  return roundDivide(amountCents * rate.numerator, rate.denominator);
}

function toUtcDate(dateLike: string | Date, label: string): Date {
  if (dateLike instanceof Date) {
    if (Number.isNaN(dateLike.getTime())) {
      throw new Error(`${label} must be a valid date.`);
    }

    return new Date(Date.UTC(dateLike.getUTCFullYear(), dateLike.getUTCMonth(), dateLike.getUTCDate()));
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateLike) ? `${dateLike}T00:00:00Z` : dateLike;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthDifference(startDate: Date, endDate: Date) {
  return (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (endDate.getUTCMonth() - startDate.getUTCMonth());
}

function addMonthsClamped(date: Date, months: number) {
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function isContractEligibleForPaymentDate(contract: CustomerContract, paymentDate: Date) {
  if (contract.status !== "active") {
    return false;
  }

  const contractStartDate = toUtcDate(contract.contractStartDate, "Contract start date");

  if (paymentDate < contractStartDate) {
    return false;
  }

  const monthNumber = getMonthDifference(contractStartDate, paymentDate) + 1;

  return monthNumber >= 1 && monthNumber <= contract.contractTermMonths;
}

function buildCommissionEvent(contract: CustomerContract, paymentDate: Date): CommissionEvent {
  const contractStartDate = toUtcDate(contract.contractStartDate, "Contract start date");
  const monthNumber = getMonthDifference(contractStartDate, paymentDate) + 1;
  const commissionAmount = calculateCommissionAmount(contract.monthlyValue, contract.commissionPercentage);

  return {
    customerContractId: contract.id,
    monthNumber,
    scoutId: contract.scoutId,
    scoutName: contract.scoutName,
    partnerId: contract.partnerId ?? null,
    businessUnitId: contract.businessUnitId,
    productName: contract.productName,
    customerName: contract.customerName,
    customerEmail: contract.customerEmail ?? null,
    monthlyContractValue: contract.monthlyValue,
    commissionPercentage: contract.commissionPercentage,
    commissionAmount,
    customerPaymentDate: toDateString(paymentDate),
    payoutDate: calculateCommissionPayoutDate(paymentDate),
    status: "pending"
  };
}

function groupCommissionsByPayoutDate(commissions: CommissionEvent[]): CommissionPayoutGroup[] {
  const groups = new Map<string, CommissionEvent[]>();

  for (const commission of commissions) {
    const existing = groups.get(commission.payoutDate) ?? [];
    existing.push(commission);
    groups.set(commission.payoutDate, existing);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([payoutDate, groupedCommissions]) => ({
      payoutDate,
      subtotal: centsToNumber(
        groupedCommissions.reduce((sum, commission) => sum + toCents(commission.commissionAmount, "Commission amount"), 0n)
      ),
      commissions: groupedCommissions.sort((left, right) => left.scoutName.localeCompare(right.scoutName))
    }));
}

/**
 * Calculates a single commission amount from a monthly contract value and scout commission rate.
 *
 * Business logic:
 * Kerzie stores scout compensation as a percentage of the customer's monthly contract value.
 * This helper accepts either decimal-style rates (`0.1`) or whole percentages (`10`) and
 * uses integer-based money math to avoid rounding drift.
 */
export function calculateCommissionAmount(contractValue: number, commissionPercentage: number) {
  const contractValueCents = toCents(contractValue, "Contract value");
  const commissionAmountCents = multiplyCentsByRate(
    contractValueCents,
    normalizeRate(commissionPercentage, "Commission percentage")
  );

  return centsToNumber(commissionAmountCents);
}

/**
 * Kerzie pays scout commissions on the 15th of the month after the customer payment clears.
 * That timing gives accounting a predictable payout cycle while still keeping commissions close
 * to the revenue event that earned them.
 */
export function calculateCommissionPayoutDate(customerPaymentDate: string | Date) {
  const baseDate = toUtcDate(customerPaymentDate, "Customer payment date");
  const payoutDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 15));

  return toDateString(payoutDate);
}

/**
 * Preserves the original lightweight schedule helper used by earlier prompt work.
 * It is now backed by the same integer-safe payout math as the broader scout system.
 */
export function buildCommissionSchedule(input: CommissionCalculationInput) {
  return {
    commissionAmount: calculateCommissionAmount(input.contractValue, input.commissionPercentage),
    payoutDate: calculateCommissionPayoutDate(input.customerPaymentDate)
  };
}

/**
 * Generates the commission ledger for a single customer payment cycle.
 *
 * Business logic:
 * Each active contract produces one commission event for the provided payment date, as long as
 * the payment falls within the contract term. The result is grouped by payout date so accounting
 * can batch all scout payments that land on the same 15th-of-the-following-month cycle.
 */
export function calculateMonthlyCommissions(contracts: CustomerContract[], paymentDate: Date): CommissionBatch {
  const normalizedPaymentDate = toUtcDate(paymentDate, "Payment date");
  const commissions = contracts
    .filter((contract) => isContractEligibleForPaymentDate(contract, normalizedPaymentDate))
    .map((contract) => buildCommissionEvent(contract, normalizedPaymentDate));
  const totalCommissionAmount = centsToNumber(
    commissions.reduce((sum, commission) => sum + toCents(commission.commissionAmount, "Commission amount"), 0n)
  );

  return {
    paymentDate: toDateString(normalizedPaymentDate),
    totalCommissionAmount,
    totalCommissionCount: commissions.length,
    payouts: groupCommissionsByPayoutDate(commissions)
  };
}

/**
 * Projects recurring scout commissions forward over the requested number of contract months.
 *
 * Business logic:
 * For each active contract, the schedule starts at the contract start date and emits up to `months`
 * monthly commission events, capped by the contract term. This makes the output deterministic and
 * useful for forward-looking pro forma models even before real payment events exist.
 */
export function generatePayoutSchedule(contracts: CustomerContract[], months: number): PayoutSchedule[] {
  if (!Number.isFinite(months) || months <= 0) {
    return [];
  }

  const commissionEvents: CommissionEvent[] = [];

  for (const contract of contracts) {
    if (contract.status !== "active") {
      continue;
    }

    const contractStartDate = toUtcDate(contract.contractStartDate, "Contract start date");
    const projectionMonths = Math.min(contract.contractTermMonths, Math.trunc(months));

    for (let index = 0; index < projectionMonths; index += 1) {
      const paymentDate = addMonthsClamped(contractStartDate, index);
      commissionEvents.push(buildCommissionEvent(contract, paymentDate));
    }
  }

  const grouped = new Map<string, CommissionEvent[]>();

  for (const event of commissionEvents) {
    const paymentGroup = grouped.get(event.customerPaymentDate) ?? [];
    paymentGroup.push(event);
    grouped.set(event.customerPaymentDate, paymentGroup);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([paymentDate, commissions]) => ({
      paymentDate,
      payoutDate: commissions[0]?.payoutDate ?? calculateCommissionPayoutDate(paymentDate),
      totalCommissionAmount: centsToNumber(
        commissions.reduce((sum, commission) => sum + toCents(commission.commissionAmount, "Commission amount"), 0n)
      ),
      totalCommissionCount: commissions.length,
      commissions: commissions.sort((left, right) => left.scoutName.localeCompare(right.scoutName))
    }));
}

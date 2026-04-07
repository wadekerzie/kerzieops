# Kerzie Ops

Kerzie Ops is the internal business operations dashboard for Kerzie Consulting LLC, doing business as Kerzie AI Solutions, in McKinney, Texas. This scaffold sets up a Next.js 14 App Router application with TypeScript, Tailwind CSS, Supabase integration helpers, shadcn-compatible components, and placeholder API routes for dashboards, pro forma modeling, stakeholder access, and monthly waterfall snapshots.

## Environment Variable Setup

Create or update `.env.local` with the following values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SILVER_MOON_ACCOUNT_ID=
```

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` power browser and SSR access.
- `SUPABASE_SERVICE_ROLE_KEY` is used only for server-side privileged reads and writes.
- `STRIPE_WEBHOOK_SECRET` secures the Silver Moon webhook route.
- `STRIPE_SILVER_MOON_ACCOUNT_ID` helps verify incoming webhook context for the connected Stripe account.

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

The scaffold is designed to boot even before live Supabase credentials are added. Protected and tokenized routes will show placeholder states until auth and data access are configured.

## Project Structure

- `app/dashboard/*`: management routes reserved for Wade and Gavin
- `app/view/[token]`: stakeholder read-only route keyed by access token
- `app/api/stripe-webhook`: Stripe webhook intake for Silver Moon
- `app/api/snapshots`: monthly snapshot calculation endpoint
- `app/api/proforma`: pro forma calculation endpoint
- `components/dashboard/*`: dashboard-specific scaffold components
- `components/shared/*`: shared display components
- `components/ui/*`: shadcn-compatible UI primitives
- `lib/*`: Supabase, waterfall, pro forma, commission, and token helpers
- `types/index.ts`: application-level types aligned to the Supabase schema
- `supabase/migrations/001_kerzie_ops_schema.sql`: foundational Kerzie Ops schema migration

## How To Add A New Business Unit

1. Add the business unit to the `business_units` seed data in [001_kerzie_ops_schema.sql](/Users/wadekerzie/Library/Mobile%20Documents/com~apple~CloudDocs/Kerzie%20AI/KerzieOps/supabase/migrations/001_kerzie_ops_schema.sql).
2. Create a new dashboard route under `app/dashboard/<slug>/page.tsx`.
3. Update selector and navigation scaffolds such as `components/shared/BusinessUnitSelector.tsx` and `components/dashboard/ManagementOverview.tsx`.
4. If the unit needs distinct calculations, extend `lib/waterfall.ts`, `lib/proforma.ts`, or add a new unit-specific reporting helper.
5. Add any unit-specific recurring expenses, partner splits, or waterfall config entries in Supabase.

## How To Adjust Partner Splits

1. Insert a new effective-dated row into `partner_splits` rather than overwriting historical rows.
2. Set `effective_date` to the date the new split begins.
3. Close the prior split with `end_date` if needed.
4. Keep explanatory business logic in the `notes` column for non-standard arrangements like Silver Moon.
5. Re-run snapshot generation for affected months if downstream payout reporting should reflect the change.

## How To Generate Stakeholder Access Tokens

1. Insert a row into `stakeholder_access_tokens` with the target `partner_id`, allowed `business_unit_ids`, optional `expires_at`, and `is_active = true`.
2. Let Supabase generate the `token` value from the schema default, or provide your own unique token string if your process requires it.
3. Share the tokenized URL in this format:

```text
/view/<token>
```

4. The scaffold validates token format and expiry through `lib/tokens.ts`.
5. Add RLS policies in a future prompt before using stakeholder links in production.

## How To Run Monthly Snapshots

There are two scaffold-ready paths:

1. Call `POST /api/snapshots` with raw revenue and expense inputs to test the waterfall engine without touching the database.
2. Extend the route to fetch current-month Supabase data and persist `monthly_snapshots` once reporting rules are finalized.

Current payload shape:

```json
{
  "revenueEvents": [
    { "grossAmount": 1000, "platformFeePercentage": 15 }
  ],
  "expenses": [
    { "amount": 120, "category": "ops_tax" },
    { "amount": 80, "category": "variable" }
  ],
  "marketingFundPercentage": 10,
  "operatingReservePercentage": 12,
  "marketingContributionsApplied": 0
}
```

## Deployment

`vercel.json` is included for Vercel deployment with standard install, build, and dev commands. Add the same environment variables in the Vercel project settings before connecting live Supabase or Stripe services.

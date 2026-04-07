import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parseSilverMoonExistingCustomersCsv,
  upsertSilverMoonExistingCustomers
} from "@/lib/silver-moon";
import type { SilverMoonExistingCustomerInsert } from "@/types";

const manualEntrySchema = z.object({
  email: z.string().email(),
  name: z.string().optional().or(z.literal("")),
  firstPurchaseDate: z.string().min(1),
  notes: z.string().optional().or(z.literal("")),
  redirectTo: z.string().default("/dashboard/silver-moon")
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const redirectTo = String(formData.get("redirectTo") ?? "/dashboard/silver-moon");
    const csvFile = formData.get("csvFile");

    if (csvFile instanceof File && csvFile.size > 0) {
      const entries = parseSilverMoonExistingCustomersCsv(await csvFile.text());

      if (entries.length === 0) {
        return NextResponse.json({ message: "No valid existing customer rows were found in the CSV." }, { status: 400 });
      }

      const result = await upsertSilverMoonExistingCustomers(entries);

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/silver-moon");

      return NextResponse.redirect(new URL(`${redirectTo}?seeded=${result.insertedCount}`, request.url), 303);
    }

    const payload = manualEntrySchema.parse({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      firstPurchaseDate: String(formData.get("firstPurchaseDate") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      redirectTo
    });

    const entry: SilverMoonExistingCustomerInsert = {
      email: payload.email,
      name: payload.name || null,
      first_purchase_date: payload.firstPurchaseDate,
      notes: payload.notes || null
    };

    await upsertSilverMoonExistingCustomers([entry]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/silver-moon");

    return NextResponse.redirect(new URL(`${redirectTo}?added=1`, request.url), 303);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to update Silver Moon existing customers."
      },
      { status: 400 }
    );
  }
}

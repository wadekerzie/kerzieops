"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const schema = z.object({
  businessUnitId: z.string().uuid(),
  revenueType: z.enum(["recurring", "one_time", "setup_fee", "commission"]),
  description: z.string().min(1),
  grossAmount: z.string().min(1),
  source: z.enum(["stripe", "ach", "check", "manual"]),
  transactionDate: z.string().min(1),
  stripePaymentId: z.string().optional(),
  isAttributed: z.boolean().optional()
});

type RevenueEventFormValues = z.infer<typeof schema>;

export function RevenueEventForm({
  businessUnits,
  defaultBusinessUnitId,
  triggerLabel = "Add revenue event",
  triggerIcon
}: {
  businessUnits: Array<{ id: string; name: string; slug: string }>;
  defaultBusinessUnitId?: string;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RevenueEventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessUnitId: defaultBusinessUnitId ?? businessUnits[0]?.id ?? "",
      revenueType: "one_time",
      description: "",
      grossAmount: "",
      source: "manual",
      transactionDate: new Date().toISOString().slice(0, 10),
      stripePaymentId: "",
      isAttributed: false
    }
  });

  const selectedBusinessUnitId = form.watch("businessUnitId");
  const selectedBusinessUnit = useMemo(
    () => businessUnits.find((unit) => unit.id === selectedBusinessUnitId) ?? null,
    [businessUnits, selectedBusinessUnitId]
  );
  const showAttribution = selectedBusinessUnit?.slug === "silver_moon";

  async function onSubmit(values: RevenueEventFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/revenue-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to save revenue event.");
      }

      toast.success("Revenue event saved");
      setOpen(false);
      form.reset({
        businessUnitId: defaultBusinessUnitId ?? businessUnits[0]?.id ?? "",
        revenueType: "one_time",
        description: "",
        grossAmount: "",
        source: "manual",
        transactionDate: new Date().toISOString().slice(0, 10),
        stripePaymentId: "",
        isAttributed: false
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save revenue event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-100 text-slate-950 hover:bg-white">
          {triggerIcon ?? <PlusCircle className="mr-2 h-4 w-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Add Revenue Event</DialogTitle>
          <DialogDescription className="text-slate-400">
            Insert a revenue event, recalculate the month snapshot, and refresh the dashboard automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="businessUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-800 bg-slate-900 text-slate-100">
                          <SelectValue placeholder="Select business unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                        {businessUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-800 bg-slate-900 text-slate-100">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="grossAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gross amount</FormLabel>
                    <FormControl>
                      <Input className="border-slate-800 bg-slate-900 text-slate-100" inputMode="decimal" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction date</FormLabel>
                    <FormControl>
                      <Input className="border-slate-800 bg-slate-900 text-slate-100" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input className="border-slate-800 bg-slate-900 text-slate-100" placeholder="Founding customer invoice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stripePaymentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stripe payment ID (optional)</FormLabel>
                  <FormControl>
                    <Input className="border-slate-800 bg-slate-900 text-slate-100" placeholder="pi_123..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showAttribution ? (
              <FormField
                control={form.control}
                name="isAttributed"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                      <input
                        checked={Boolean(field.value)}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-emerald-400"
                        onChange={(event) => field.onChange(event.target.checked)}
                        type="checkbox"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-100">New customer sale attributable to Kerzie efforts</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Only use this for Silver Moon sales where Kerzie directly originated the customer relationship.
                        </p>
                      </div>
                    </label>
                  </FormItem>
                )}
              />
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save revenue event"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

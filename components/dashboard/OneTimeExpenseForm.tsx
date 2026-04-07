"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  businessUnitId: z.string().min(1),
  category: z.enum(["ops_tax", "marketing", "reserve", "variable", "capital", "one_time"]),
  vendor: z.string().min(1),
  amount: z.string().min(1),
  expenseDate: z.string().min(1)
});

type OneTimeExpenseFormValues = z.infer<typeof schema>;

export function OneTimeExpenseForm({
  businessUnits
}: {
  businessUnits: Array<{ id: string; name: string; slug: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OneTimeExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessUnitId: "global",
      category: "one_time",
      vendor: "",
      amount: "",
      expenseDate: new Date().toISOString().slice(0, 10)
    }
  });

  async function onSubmit(values: OneTimeExpenseFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to create expense.");
      }

      toast.success("Expense logged");
      setOpen(false);
      form.reset({
        businessUnitId: "global",
        category: "one_time",
        vendor: "",
        amount: "",
        expenseDate: new Date().toISOString().slice(0, 10)
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-100 text-slate-950 hover:bg-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Log one-time expense
        </Button>
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Log One-Time Expense</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a one-time expense and refresh the management dashboard totals.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="businessUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-slate-800 bg-slate-900 text-slate-100">
                        <SelectValue placeholder="Choose a business unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                      <SelectItem value="global">Kerzie Global</SelectItem>
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

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-800 bg-slate-900 text-slate-100">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                        <SelectItem value="one_time">One-time</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="capital">Capital</SelectItem>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="ops_tax">Ops tax</SelectItem>
                        <SelectItem value="reserve">Reserve</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input className="border-slate-800 bg-slate-900 text-slate-100" placeholder="Vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input className="border-slate-800 bg-slate-900 text-slate-100" inputMode="decimal" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input className="border-slate-800 bg-slate-900 text-slate-100" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

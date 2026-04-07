"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProformaPrintButton() {
  return (
    <Button className="bg-slate-100 text-slate-950 hover:bg-white" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" />
      Print / Save PDF
    </Button>
  );
}

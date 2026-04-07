"use client";

import { useState } from "react";

import { Slider } from "@/components/ui/slider";

export function ProformaSlider() {
  const [value, setValue] = useState([15]);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-sm font-medium">Apple cut assumption</p>
        <p className="text-sm text-muted-foreground">{value[0]}%</p>
      </div>
      <Slider max={30} min={0} step={1} value={value} onValueChange={setValue} />
    </div>
  );
}

"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const defaultUnits = [
  { label: "Kerzie AI", value: "kerzie_ai" },
  { label: "Zorli", value: "zorli" },
  { label: "GotaGuy", value: "gotaguuy" },
  { label: "Unison", value: "unison" },
  { label: "Silver Moon", value: "silver_moon" },
  { label: "Silver Naturals", value: "silver_naturals" }
];

export function BusinessUnitSelector() {
  const [value, setValue] = useState(defaultUnits[0]?.value ?? "");

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-full md:w-[220px]">
        <SelectValue placeholder="Select business unit" />
      </SelectTrigger>
      <SelectContent>
        {defaultUnits.map((unit) => (
          <SelectItem key={unit.value} value={unit.value}>
            {unit.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

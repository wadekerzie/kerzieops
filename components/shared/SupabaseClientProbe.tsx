"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProbeState {
  ok: boolean;
  message: string;
  errorCode: string | null;
  units: Array<{ id: string; name: string; slug: string }>;
}

export function SupabaseClientProbe() {
  const [state, setState] = useState<ProbeState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function runProbe() {
      try {
        const response = await fetch("/api/supabase-test", {
          cache: "no-store"
        });
        const payload = (await response.json()) as ProbeState;

        if (isMounted) {
          setState(payload);
        }
      } catch (error) {
        if (isMounted) {
          setState({
            ok: false,
            message: error instanceof Error ? error.message : "Client probe failed.",
            errorCode: null,
            units: []
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    runProbe();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardDescription>Client query path</CardDescription>
        <CardTitle>Browser via Next API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Running client probe...</p>
        ) : (
          <>
            <Badge variant={state?.ok ? "secondary" : "outline"}>{state?.ok ? "Connected" : "Needs attention"}</Badge>
            <p className="text-sm text-muted-foreground">{state?.message ?? "No response yet."}</p>
            {state?.errorCode ? <p className="text-xs text-muted-foreground">Code: {state.errorCode}</p> : null}
            {state?.units?.length ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {state.units.map((unit) => (
                  <li key={unit.id}>
                    {unit.name} <span className="text-xs">({unit.slug})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <div className="max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This route does not exist or the stakeholder token could not be validated.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Back to Kerzie Ops</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

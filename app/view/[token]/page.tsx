import { notFound } from "next/navigation";

import { StakeholderView } from "@/components/shared/StakeholderView";
import { validateToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function StakeholderTokenPage({
  params
}: {
  params: { token: string };
}) {
  const accessContext = await validateToken(params.token);

  if (!accessContext) {
    notFound();
  }

  return <StakeholderView accessContext={accessContext} />;
}

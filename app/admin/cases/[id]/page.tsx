"use client";

import { use } from "react";
import { CaseDetailView } from "@/components/admin/case-detail";

/** One case, inside the personal centre's column; the way back to the queue and on through it is on its own top bar. */
export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CaseDetailView id={id} />;
}

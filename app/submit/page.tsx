import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "提交說說", robots: { index: false } };

export default function SubmitPage() {
  return (
    <PageShell className="submit">
      <SubmitForm />
    </PageShell>
  );
}

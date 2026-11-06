"use client";

import { Button } from "@heroui/react";
import { RotateCw } from "lucide-react";
import { MissingCase } from "@/components/missing-case";

/** §12.7 /500: the chips knocked over. Sentry reporting arrives with M7. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="missing">
      <MissingCase gone={3} fallen />
      <div className="missing-text">
        <h1 className="section-title">字盤翻倒了</h1>
        <p>這個頁面暫時排不出來，請再試一次。</p>
        <div className="missing-actions">
          <Button color="primary" radius="full" data-magnet startContent={<RotateCw aria-hidden="true" size={18} />} onPress={reset}>
            重試
          </Button>
        </div>
      </div>
    </main>
  );
}

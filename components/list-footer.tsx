"use client";

import { Button } from "@heroui/react";
import { ChevronsDown, RotateCw } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ListStatus } from "@/lib/use-paged-list";

type Props = {
  status: ListStatus;
  hasMore: boolean;
  empty: boolean;
  loadMore: () => Promise<void>;
  /** Off for lists someone is working through: rows should not arrive under their cursor. */
  auto?: boolean;
};

/** Infinite loading with a real button underneath, for keyboards and for browsers that never fire the observer. */
export function ListFooter({ status, hasMore, empty, loadMore, auto = true }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!auto || !element || !hasMore || status !== "ready") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [auto, hasMore, loadMore, status]);

  if (empty || (!hasMore && status !== "error")) return null;
  return (
    <div className="list-footer" ref={sentinel}>
      {status === "error" && <p role="alert">下一頁沒有載入成功。</p>}
      <Button
        radius="full"
        variant="bordered"
        data-magnet
        isLoading={status === "more"}
        startContent={status === "more" ? undefined : status === "error" ? <RotateCw aria-hidden="true" size={18} /> : <ChevronsDown aria-hidden="true" size={18} />}
        onPress={() => void loadMore()}
      >
        {status === "more" ? "載入中" : status === "error" ? "重試" : "載入更多"}
      </Button>
    </div>
  );
}

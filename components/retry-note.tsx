import { Button } from "@heroui/react";
import { CircleAlert, RotateCw } from "lucide-react";
import { StateNote } from "./state-note";

/**
 * A list or a panel that did not load, and the way to try again. Apart from StateNote: server pages show that one, and
 * importing HeroUI into them broke `next dev`.
 */
export function RetryNote({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateNote title={title} icon={CircleAlert}>
        <Button radius="full" variant="bordered" data-magnet startContent={<RotateCw aria-hidden="true" size={18} />} onPress={onRetry}>
          重試
        </Button>
      </StateNote>
    </div>
  );
}

import type { CSSProperties } from "react";
import { CATEGORIES } from "@/lib/categories";
import { CategoryIcon } from "./category-icon";
import { stockOf } from "./quote-sheet";

/**
 * The category chips with one of them gone, its place a dashed outline where the caret still blinks. Knocked over,
 * the chips lie at angles instead (the error page).
 */
export function MissingCase({ gone, fallen = false }: { gone: number; fallen?: boolean }) {
  return (
    <div className="missing-case" data-fallen={fallen || undefined} aria-hidden="true">
      {CATEGORIES.map(({ key, name }, index) =>
        index === gone ? (
          <span key={key} className="case-cell" data-gone="true">
            <span className="caret caret-blink" />
          </span>
        ) : (
          <span key={key} className="case-cell" style={{ ...stockOf(key), "--i": index } as CSSProperties}>
            <CategoryIcon category={key} />
            {name}
          </span>
        ),
      )}
    </div>
  );
}

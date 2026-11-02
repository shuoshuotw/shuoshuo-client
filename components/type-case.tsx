"use client";

import { CATEGORIES } from "@/lib/categories";
import { stockOf } from "./quote-sheet";

type Props = {
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
};

/** The 13 categories as a printer's case: every cell stays recessed until it is chosen. */
export function TypeCase({ selected, onToggle, onClear }: Props) {
  return (
    <div className="type-case" role="group" aria-label="類別字盤">
      <button type="button" className="case-cell" data-on={selected.length === 0} aria-pressed={selected.length === 0} onClick={onClear}>
        全部
      </button>
      {CATEGORIES.map(({ key, name }) => {
        const on = selected.includes(key);
        return (
          <button key={key} type="button" className="case-cell" data-on={on} aria-pressed={on} style={stockOf(key)} onClick={() => onToggle(key)}>
            {name}
          </button>
        );
      })}
    </div>
  );
}

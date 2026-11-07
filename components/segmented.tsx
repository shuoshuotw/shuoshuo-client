"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { useSlidingPill } from "./dock-slot";
import { usePressRipple } from "./ripple";

type Option<T extends string> = { key: T; label: string; icon?: LucideIcon };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (key: T) => void;
};

/**
 * Two or three states of one list (M-22, tabs sliding): the same glass track and sliding pill as a profile's tabs, each
 * choice pulled toward the pointer, the pill pulled along with the chosen one, and a ripple where it is pressed.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  const track = useRef<HTMLDivElement>(null);
  useSlidingPill(track, value);
  return (
    <div className="route-tabs" ref={track} role="group" aria-label={label}>
      <span className="nav-pill" aria-hidden="true" />
      {options.map((option) => (
        <Choice key={option.key} option={option} active={option.key === value} onChange={onChange} />
      ))}
    </div>
  );
}

function Choice<T extends string>({ option: { key, label, icon: Icon }, active, onChange }: { option: Option<T>; active: boolean; onChange: (key: T) => void }) {
  const { spread, ripples } = usePressRipple();
  return (
    <button
      type="button"
      data-magnet
      data-active={active}
      aria-pressed={active}
      onClick={(event) => {
        spread(event);
        onChange(key);
      }}
    >
      {Icon && <Icon aria-hidden="true" size={18} />}
      {label}
      {ripples}
    </button>
  );
}

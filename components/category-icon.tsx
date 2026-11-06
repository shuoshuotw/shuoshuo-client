import { Bot, BookImage, Brain, Clapperboard, Feather, Gamepad2, Globe, LibraryBig, type LucideIcon, Music, PenTool, Shapes, Skull, Tv } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";

const ICONS: Record<CategoryKey, LucideIcon> = {
  anime: Tv,
  manga: BookImage,
  game: Gamepad2,
  music: Music,
  literature: LibraryBig,
  original: PenTool,
  flim: Clapperboard,
  poetry: Feather,
  internet: Globe,
  philosophy: Brain,
  "anti-motiv": Skull,
  ai: Bot,
  other: Shapes,
};

/** Each category's own icon, drawn in its colour wherever the category is named; it carries the key for its move (M-20). */
export function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const Icon = ICONS[category as CategoryKey] ?? Shapes;
  return <Icon className="category-icon" data-category={category} aria-hidden="true" size={size} />;
}

/** A category's name and icon on a chip of its own make: each category's chip is drawn from what it pictures. */
export function CategoryChip({ category }: { category: string }) {
  return (
    <span className="category-chip" data-category={category}>
      <CategoryIcon category={category} />
      {CATEGORIES.find(({ key }) => key === category)?.name ?? category}
    </span>
  );
}

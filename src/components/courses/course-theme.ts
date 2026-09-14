import { CourseLevel, LessonType } from "@/generated/prisma";

export interface ColorAccent {
  /** Light tint background, e.g. for badges and icon chips. */
  bg: string;
  /** Text color that reads well on `bg`. */
  text: string;
  /** Ring/border color that pairs with `bg`. */
  ring: string;
  /** Saturated background for gradients and fallback thumbnails. */
  from: string;
  to: string;
}

export const AMBER: ColorAccent = {
  bg: "bg-amber-100 dark:bg-amber-500/15",
  text: "text-amber-700 dark:text-amber-300",
  ring: "ring-amber-200 dark:ring-amber-500/30",
  from: "from-amber-200",
  to: "to-amber-100",
};

export const SKY: ColorAccent = {
  bg: "bg-sky-100 dark:bg-sky-500/15",
  text: "text-sky-700 dark:text-sky-300",
  ring: "ring-sky-200 dark:ring-sky-500/30",
  from: "from-sky-200",
  to: "to-sky-100",
};

export const EMERALD: ColorAccent = {
  bg: "bg-emerald-100 dark:bg-emerald-500/15",
  text: "text-emerald-700 dark:text-emerald-300",
  ring: "ring-emerald-200 dark:ring-emerald-500/30",
  from: "from-emerald-200",
  to: "to-emerald-100",
};

export const VIOLET: ColorAccent = {
  bg: "bg-violet-100 dark:bg-violet-500/15",
  text: "text-violet-700 dark:text-violet-300",
  ring: "ring-violet-200 dark:ring-violet-500/30",
  from: "from-violet-200",
  to: "to-violet-100",
};

export const ROSE: ColorAccent = {
  bg: "bg-rose-100 dark:bg-rose-500/15",
  text: "text-rose-700 dark:text-rose-300",
  ring: "ring-rose-200 dark:ring-rose-500/30",
  from: "from-rose-200",
  to: "to-rose-100",
};

/** A small rotation of warm, kid-friendly colors used across course cards, modules, and lesson chips. */
export const ACCENT_PALETTE: readonly [ColorAccent, ...ColorAccent[]] = [AMBER, SKY, EMERALD, VIOLET, ROSE];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministically picks a palette entry from a seed (course/module id) so colors stay stable across renders. */
export function pickAccent(seed: string): ColorAccent {
  return ACCENT_PALETTE[hashString(seed) % ACCENT_PALETTE.length] ?? AMBER;
}

export const LEVEL_THEME: Record<CourseLevel, ColorAccent> = {
  [CourseLevel.BEGINNER]: EMERALD,
  [CourseLevel.INTERMEDIATE]: AMBER,
  [CourseLevel.ADVANCED]: ROSE,
};

export const LESSON_TYPE_THEME: Record<LessonType, ColorAccent> = {
  [LessonType.VIDEO]: SKY,
  [LessonType.ARTICLE]: AMBER,
  [LessonType.QUIZ]: VIOLET,
  [LessonType.DOCUMENT]: EMERALD,
};

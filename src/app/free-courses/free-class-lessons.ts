export interface FreeClassLesson {
  num: number;
  /** Small label above the title in the playlist. */
  eyebrow: string;
  /** Optional pill at the end of the playlist row; empty for none. */
  badge: string;
  title: string;
  /** Label above the title under the big player. */
  caption: string;
  /** Shown under the big player; may contain simple HTML such as <em>. */
  desc: string;
  dur: string;
  /** The lesson's video file. */
  src: string;
}

/**
 * The lessons of the free Communication Class, in playlist order. To change
 * a lesson's video, replace its `src` with that video's URL.
 */
export const FREE_CLASS_LESSONS: FreeClassLesson[] = [
  {
    num: 1,
    eyebrow: "Lesson 1",
    badge: "Start here",
    title: "The Two-Choice Method",
    caption: "Lesson 1 · Start Here",
    desc: "Press play, grab two small objects your bird likes, and let's teach them to tell you what they want.",
    dur: "5 min",
    src: "https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/6a144e10e05851175c7b1fa2.mp4",
  },
  {
    num: 2,
    eyebrow: "Lesson 2",
    badge: "For shy birds",
    title: "Look Communication",
    caption: "Lesson 2",
    desc: "The gentler version — perfect for nervous, shy, fearful or bitey birds. They simply <em>look</em> at the option they want. No touching, no pressure.",
    dur: "5 min",
    src: "https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/6a144e10e05851175c7b1fa2.mp4",
  },
  {
    num: 3,
    eyebrow: "Lesson 3",
    badge: "For confident birds",
    title: "Touch Communication",
    caption: "Lesson 3",
    desc: "The more confident version — for birds who are ready to tap or touch to make their choice.",
    dur: "5 min",
    src: "https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/6a144e10e05851175c7b1fa2.mp4",
  },
  {
    num: 4,
    eyebrow: "Lesson 4",
    badge: "",
    title: "The Exact Words & Timing",
    caption: "Lesson 4",
    desc: "When to wait, when to respond, and what <em>not</em> to do — this part matters more than people expect.",
    dur: "5 min",
    src: "https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/6a144e10e05851175c7b1fa2.mp4",
  },
  {
    num: 5,
    eyebrow: "Lesson 5",
    badge: "",
    title: 'What "Yes" Actually Looks Like',
    caption: "Lesson 5",
    desc: 'How to read "yes" in bird body language — and how to honor it the moment you see it.',
    dur: "5 min",
    src: "https://assets.cdn.filesafe.space/0YSKdAtU0UbMFhLcXsOl/media/6a144e10e05851175c7b1fa2.mp4",
  },
];

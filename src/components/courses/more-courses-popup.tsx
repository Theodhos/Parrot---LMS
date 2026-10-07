"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The next step of the sales funnel: the landing page that sells the other courses. */
const NEXT_STEP_URL = "https://registration.parrotkindergarten.com/main-landing-page-2-page";

// Shown 40 seconds after the page opens and, if closed, once more 40 seconds
// later -- twice in all for a visitor, remembered in their browser so it
// does not come back on every visit.
const DELAY_MS = 40_000;
const MAX_SHOWINGS = 2;
const STORAGE_KEY = "free-courses-next-step-shown";

function readShownCount(): number {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeShownCount(count: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(count));
  } catch {
    // Storage blocked: the popup then simply counts within this page view.
  }
}

/** Invites a free member on to the rest of the program, on the Free Courses page. */
export function MoreCoursesPopup() {
  const [open, setOpen] = useState(false);
  const shownCount = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function scheduleShowing() {
    if (shownCount.current >= MAX_SHOWINGS) return;
    timer.current = setTimeout(() => {
      shownCount.current += 1;
      writeShownCount(shownCount.current);
      setOpen(true);
    }, DELAY_MS);
  }

  useEffect(() => {
    shownCount.current = readShownCount();
    scheduleShowing();
    return () => clearTimeout(timer.current);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) scheduleShowing();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl sm:max-w-md">
        <DialogHeader>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-orange-600 uppercase dark:text-orange-300">
            <Sparkles className="size-3.5" />
            Your next step
          </span>
          <DialogTitle className="text-xl">Want more than the free courses?</DialogTitle>
          <DialogDescription>
            This is the next step of your journey: the full Parrot Kindergarten program unlocks all the other
            courses, the live calls and the community.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full !rounded-full !bg-orange-500 !text-white hover:!bg-orange-600"
            render={
              <a href={NEXT_STEP_URL}>
                Unlock more courses
                <ArrowRight />
              </a>
            }
          />
          <Button variant="ghost" className="w-full !rounded-full" onClick={() => handleOpenChange(false)}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuizPerformancePoint } from "@/features/analytics/types/analytics.types";

export interface QuizPerformanceSummaryProps {
  items: QuizPerformancePoint[];
}

function scoreAccent(score: number): string {
  if (score >= 70)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (score >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
}

export function QuizPerformanceSummary({ items }: QuizPerformanceSummaryProps) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No quiz attempts yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.quizId} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <Trophy className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="font-heading truncate font-medium">{item.quizTitle}</p>
              <p className="text-muted-foreground text-xs">
                {item.attempts} attempt{item.attempts === 1 ? "" : "s"} · best {item.bestScore}%
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("border-transparent font-medium", scoreAccent(item.averageScore))}
          >
            {item.averageScore}% avg
          </Badge>
        </li>
      ))}
    </ul>
  );
}

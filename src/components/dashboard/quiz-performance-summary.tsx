import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuizPerformancePoint } from "@/features/analytics/types/analytics.types";

export interface QuizPerformanceSummaryProps {
  items: QuizPerformancePoint[];
}

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 70) return "default";
  if (score >= 40) return "secondary";
  return "destructive";
}

export function QuizPerformanceSummary({ items }: QuizPerformanceSummaryProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.quizId} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Trophy className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium">{item.quizTitle}</p>
              <p className="text-xs text-muted-foreground">
                {item.attempts} attempt{item.attempts === 1 ? "" : "s"} · best {item.bestScore}%
              </p>
            </div>
          </div>
          <Badge variant={scoreBadgeVariant(item.averageScore)}>{item.averageScore}% avg</Badge>
        </li>
      ))}
    </ul>
  );
}

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProgressSummaryProps {
  /** Server-computed percentage (0-100). Never derive this on the client. */
  percent: number;
  completedLessons: number;
  totalLessons: number;
  label?: string;
  className?: string;
  /** Optional override for the filled bar, e.g. a colorful gradient instead of the default `bg-primary`. */
  indicatorClassName?: string;
}

/** A labeled progress bar: "X% complete" + visual bar + "X / Y lessons completed". */
export function ProgressSummary({
  percent,
  completedLessons,
  totalLessons,
  label = "Course progress",
  className,
  indicatorClassName,
}: ProgressSummaryProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} indicatorClassName={indicatorClassName} />
      <p className="text-muted-foreground text-xs">
        {completedLessons} / {totalLessons} lessons completed
      </p>
    </div>
  );
}

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  className?: string;
  /** Optional colored circle behind the icon, e.g. "bg-amber-100 text-amber-700". Defaults to a plain muted icon. */
  iconClassName?: string;
}

/** A small KPI tile: label, big value, optional icon and hint line. */
export function StatCard({ label, value, icon, hint, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        {icon && (
          <div
            className={
              iconClassName
                ? cn("flex size-7 items-center justify-center rounded-full", iconClassName)
                : "text-muted-foreground"
            }
          >
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="font-heading text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

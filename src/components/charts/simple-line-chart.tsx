"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface SimpleLineChartProps<T extends Record<string, unknown>> {
  data: T[];
  config: ChartConfig;
  xKey: keyof T & string;
  series: (keyof T & string)[];
  className?: string;
}

/** A single- or multi-series line chart, e.g. daily learning minutes over time. */
export function SimpleLineChart<T extends Record<string, unknown>>({
  data,
  config,
  xKey,
  series,
  className,
}: SimpleLineChartProps<T>) {
  return (
    <ChartContainer config={config} className={className}>
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey as never} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((key) => (
          <Line
            key={key}
            type="monotone"
            // Recharts' TypedDataKey is overly strict for a generic wrapper like this.
            dataKey={key as never}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

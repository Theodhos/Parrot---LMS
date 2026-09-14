"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface SimpleAreaChartProps<T extends Record<string, unknown>> {
  data: T[];
  config: ChartConfig;
  xKey: keyof T & string;
  series: (keyof T & string)[];
  className?: string;
}

/** A stacked/overlaid area chart, e.g. activity over time. */
export function SimpleAreaChart<T extends Record<string, unknown>>({
  data,
  config,
  xKey,
  series,
  className,
}: SimpleAreaChartProps<T>) {
  return (
    <ChartContainer config={config} className={className}>
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey as never} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((key) => (
          <Area
            key={key}
            type="monotone"
            // Recharts' TypedDataKey is overly strict for a generic wrapper like this.
            dataKey={key as never}
            fill={`var(--color-${key})`}
            fillOpacity={0.2}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

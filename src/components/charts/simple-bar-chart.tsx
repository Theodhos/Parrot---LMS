"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface SimpleBarChartProps<T extends Record<string, unknown>> {
  data: T[];
  config: ChartConfig;
  xKey: keyof T & string;
  series: (keyof T & string)[];
  layout?: "horizontal" | "vertical";
  className?: string;
}

/** A grouped/stacked bar chart, e.g. completed vs remaining lessons per course. */
export function SimpleBarChart<T extends Record<string, unknown>>({
  data,
  config,
  xKey,
  series,
  layout = "horizontal",
  className,
}: SimpleBarChartProps<T>) {
  const isVertical = layout === "vertical";
  return (
    <ChartContainer config={config} className={className}>
      <BarChart data={data} layout={layout} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            {/* Recharts' TypedDataKey is overly strict for a generic wrapper like this. */}
            <YAxis dataKey={xKey as never} type="category" tickLine={false} axisLine={false} width={120} />
            <XAxis type="number" tickLine={false} axisLine={false} />
          </>
        ) : (
          <XAxis dataKey={xKey as never} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((key) => (
          <Bar key={key} dataKey={key as never} fill={`var(--color-${key})`} radius={4} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

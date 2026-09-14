"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";

export interface SimplePieChartProps<T extends Record<string, unknown>> {
  data: T[];
  config: ChartConfig;
  dataKey: keyof T & string;
  nameKey: keyof T & string;
  className?: string;
}

/** A donut chart, e.g. completed vs remaining lessons. */
export function SimplePieChart<T extends Record<string, unknown>>({
  data,
  config,
  dataKey,
  nameKey,
  className,
}: SimplePieChartProps<T>) {
  return (
    <ChartContainer config={config} className={className}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius={50} outerRadius={80} strokeWidth={4}>
          {data.map((entry, index) => (
            <Cell key={index} fill={`var(--color-${String(entry[nameKey])})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
      </PieChart>
    </ChartContainer>
  );
}

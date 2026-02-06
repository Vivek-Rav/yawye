"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { aggregateScans } from "@/lib/chartUtils";
import type { ChartDataPoint } from "@/lib/chartUtils";
import type { StoredScan } from "@/lib/firestore";
import type { FilterPeriod } from "@/lib/utils";

interface CalorieChartProps {
  filteredScans: StoredScan[];
  filter: FilterPeriod;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="bg-gray-900/90 backdrop-blur border border-white/20 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-gray-400 text-xs">{point.fullLabel}</p>
      <p className="text-white text-sm font-bold">
        {point.calories.toLocaleString()} kcal
      </p>
    </div>
  );
}

export default function CalorieChart({
  filteredScans,
  filter,
}: CalorieChartProps) {
  const data = useMemo(
    () => aggregateScans(filteredScans, filter),
    [filteredScans, filter]
  );

  const tickInterval = useMemo(() => {
    switch (filter) {
      case "day":
        return 3;
      case "week":
        return 0;
      case "month":
        return 4;
      case "year":
        return 0;
    }
  }, [filter]);

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 mb-5">
      <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">
        Calorie Trend
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            interval={tickInterval}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            width={40}
            allowDecimals={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="calories"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#calorieGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#818cf8",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

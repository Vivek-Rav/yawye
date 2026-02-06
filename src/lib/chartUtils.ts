import type { FilterPeriod } from "@/lib/utils";
import type { StoredScan } from "@/lib/firestore";

export interface ChartDataPoint {
  label: string;
  calories: number;
  fullLabel: string;
}

export function aggregateScans(
  scans: StoredScan[],
  filter: FilterPeriod
): ChartDataPoint[] {
  switch (filter) {
    case "day":
      return aggregateByHour(scans);
    case "week":
      return aggregateByDay(scans, 7);
    case "month":
      return aggregateByDay(scans, 30);
    case "year":
      return aggregateByMonth(scans);
  }
}

function aggregateByHour(scans: StoredScan[]): ChartDataPoint[] {
  const now = new Date();
  const buckets: ChartDataPoint[] = [];

  for (let i = 23; i >= 0; i--) {
    const bucketTime = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = bucketTime.getHours();
    const dateStr = bucketTime.toDateString();

    const label = bucketTime.toLocaleTimeString([], { hour: "numeric" });
    const fullLabel = bucketTime.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
    });

    let cals = 0;
    for (const s of scans) {
      if (s.createdAt.getHours() === hour && s.createdAt.toDateString() === dateStr) {
        cals += s.calories;
      }
    }

    buckets.push({ label, calories: cals, fullLabel });
  }

  return buckets;
}

function aggregateByDay(scans: StoredScan[], days: number): ChartDataPoint[] {
  const now = new Date();
  const buckets: ChartDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const bucketDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = bucketDate.toDateString();

    const label =
      days <= 7
        ? bucketDate.toLocaleDateString([], { weekday: "short" })
        : bucketDate.toLocaleDateString([], { month: "short", day: "numeric" });

    const fullLabel = bucketDate.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    let cals = 0;
    for (const s of scans) {
      if (s.createdAt.toDateString() === dateStr) {
        cals += s.calories;
      }
    }

    buckets.push({ label, calories: cals, fullLabel });
  }

  return buckets;
}

function aggregateByMonth(scans: StoredScan[]): ChartDataPoint[] {
  const now = new Date();
  const buckets: ChartDataPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = bucketDate.getMonth();
    const year = bucketDate.getFullYear();

    const label = bucketDate.toLocaleDateString([], { month: "short" });
    const fullLabel = bucketDate.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });

    let cals = 0;
    for (const s of scans) {
      if (s.createdAt.getMonth() === month && s.createdAt.getFullYear() === year) {
        cals += s.calories;
      }
    }

    buckets.push({ label, calories: cals, fullLabel });
  }

  return buckets;
}

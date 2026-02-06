"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getUserScans, clearUserScans } from "@/lib/firestore";
import type { StoredScan } from "@/lib/firestore";
import dynamic from "next/dynamic";
import HistoryCard from "@/components/HistoryCard";
import { formatDate, getFilterStartDate } from "@/lib/utils";
import type { FilterPeriod } from "@/lib/utils";

const CalorieChart = dynamic(() => import("@/components/CalorieChart"), {
  ssr: false,
  loading: () => (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 mb-5 h-[252px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const filters: { label: string; value: FilterPeriod }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [allScans, setAllScans] = useState<StoredScan[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [filter, setFilter] = useState<FilterPeriod>("week");
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetchLoading(true);
      const scans = await getUserScans(user.uid);
      setAllScans(scans);
      setFetchLoading(false);
    })();
  }, [user]);

  const filteredScans = useMemo(() => {
    const start = getFilterStartDate(filter);
    return allScans.filter((s) => s.createdAt >= start);
  }, [allScans, filter]);

  const totalCalories = useMemo(
    () => filteredScans.reduce((sum, s) => sum + s.calories, 0),
    [filteredScans]
  );

  // Group by date string for separators
  const grouped = useMemo(() => {
    const map = new Map<string, StoredScan[]>();
    for (const scan of filteredScans) {
      const key = scan.createdAt.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(scan);
    }
    return Array.from(map.entries()); // already in desc order from Firestore
  }, [filteredScans]);

  const handleClearHistory = async () => {
    if (!user) return;
    setIsClearing(true);
    await clearUserScans(user.uid);
    setAllScans([]);
    setConfirmClear(false);
    setIsClearing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filterLabel = filters.find((f) => f.value === filter)?.label ?? "";

  return (
    <div>
      {/* Page title */}
      <h1 className="text-white text-2xl font-extrabold mb-4">History</h1>

      {/* Summary card */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-5 mb-4 text-center">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
          Total Calories — This {filterLabel}
        </p>
        <p className="text-white text-5xl font-extrabold">
          {totalCalories.toLocaleString()}
        </p>
        <p className="text-gray-600 text-xs mt-1">
          {filteredScans.length} scan{filteredScans.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              filter === f.value
                ? "bg-indigo-600 text-white shadow"
                : "bg-white/8 border border-white/15 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Calorie trend chart */}
      {!fetchLoading && filteredScans.length > 0 && (
        <CalorieChart filteredScans={filteredScans} filter={filter} />
      )}

      {/* Clear history button — only when scans exist */}
      {!fetchLoading && allScans.length > 0 && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-red-400 text-sm hover:text-red-300 transition-colors"
          >
            Clear all history
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-gray-900 border border-white/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-white text-lg font-extrabold">Clear all history?</h3>
            <p className="text-gray-400 text-sm">
              This will permanently delete every scan from your account. There is no way to undo this.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 hover:bg-red-500 transition-colors"
              >
                {isClearing ? "Deleting…" : "Yes, delete everything"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 bg-white/8 border border-white/15 text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-white/12 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {fetchLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-gray-400 text-sm">
            No scans yet for this period.
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Go scan some food!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, scans]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                {formatDate(scans[0].createdAt)}
              </p>
              <div className="space-y-2">
                {scans.map((scan) => (
                  <HistoryCard key={scan.id} scan={scan} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

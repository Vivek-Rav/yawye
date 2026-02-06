import RiskBadge from "@/components/RiskBadge";
import { formatTime } from "@/lib/utils";
import type { StoredScan } from "@/lib/firestore";

const borderColor = {
  high: "border-red-500",
  medium: "border-amber-500",
  low: "border-green-500",
};

export default function HistoryCard({ scan }: { scan: StoredScan }) {
  return (
    <div
      className={`bg-white/8 backdrop-blur border border-white/10 border-l-4 ${borderColor[scan.riskLevel]} rounded-xl p-4`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-white font-semibold text-base">{scan.foodName}</h4>
        <RiskBadge level={scan.riskLevel} />
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white text-2xl font-bold">{scan.calories}</span>
        <span className="text-gray-500 text-sm">kcal</span>
        <span className="text-gray-600 text-xs ml-auto">
          {formatTime(scan.createdAt)}
        </span>
      </div>

      {scan.humorComment && (
        <p className="text-violet-400 italic text-xs mt-1.5">
          💬 {scan.humorComment}
        </p>
      )}

      {scan.context && (
        <p className="text-gray-600 text-xs mt-1">📝 {scan.context}</p>
      )}
    </div>
  );
}

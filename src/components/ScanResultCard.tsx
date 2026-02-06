"use client";

import { useEffect, useState } from "react";
import RiskBadge from "@/components/RiskBadge";
import type { ScanResult } from "@/lib/gemini";

export default function ScanResultCard({ result }: { result: ScanResult }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h3 className="text-white text-xl font-bold">{result.foodName}</h3>
          <RiskBadge level={result.riskLevel} />
        </div>

        {/* Calories */}
        <div className="flex items-baseline gap-1">
          <span className="text-white text-5xl font-extrabold">
            {result.calories}
          </span>
          <span className="text-gray-400 text-lg font-medium">kcal</span>
        </div>

        {/* Brand note — only when a branded product was detected */}
        {result.brandNote && (
          <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl px-4 py-3">
            <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wide mb-1">
              Brand detected
            </p>
            <p className="text-gray-300 text-sm">{result.brandNote}</p>
          </div>
        )}

        {/* Risk reason */}
        <p className="text-gray-400 text-sm">{result.riskReason}</p>

        {/* Ingredients */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
            Estimated Ingredients
          </p>
          <div className="flex flex-wrap gap-2">
            {result.ingredients.map((ing) => (
              <span
                key={ing}
                className="bg-white/8 border border-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-full"
              >
                {ing}
              </span>
            ))}
          </div>
        </div>

        {/* Burn It Off */}
        {result.burnOff && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
              Burn It Off
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="text-lg mr-1.5">🏃</span>
                <span className="text-gray-400 text-xs">Treadmill</span>
                <p className="text-white text-sm font-semibold mt-0.5">{result.burnOff.treadmill}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="text-lg mr-1.5">🚴</span>
                <span className="text-gray-400 text-xs">Cycling</span>
                <p className="text-white text-sm font-semibold mt-0.5">{result.burnOff.cycling}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="text-lg mr-1.5">🚶</span>
                <span className="text-gray-400 text-xs">Walking</span>
                <p className="text-white text-sm font-semibold mt-0.5">{result.burnOff.walking}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                <span className="text-lg mr-1.5">🏃‍♂️</span>
                <span className="text-gray-400 text-xs">Running</span>
                <p className="text-white text-sm font-semibold mt-0.5">{result.burnOff.running}</p>
              </div>
            </div>
            <p className="text-amber-400 italic text-sm text-center mt-2">
              🔥 {result.burnOff.burnComment}
            </p>
          </div>
        )}

        {/* Humor divider */}
        <div className="border-t border-white/10 pt-3">
          <p className="text-violet-300 italic text-sm text-center">
            💬 {result.humorComment}
          </p>
        </div>
      </div>
    </div>
  );
}

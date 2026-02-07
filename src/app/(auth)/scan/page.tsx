"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CameraModal from "@/components/CameraModal";
import ScanResultCard from "@/components/ScanResultCard";
import { saveScan } from "@/lib/firestore";
import type { ScanResult } from "@/lib/gemini";

const DAILY_SCAN_LIMIT = 3;

export default function ScanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(DAILY_SCAN_LIMIT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [limitLoading, setLimitLoading] = useState(true);

  const limitReached = remaining <= 0 && !isAdmin;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/scan-limit", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setRemaining(data.remaining);
          setIsAdmin(data.isAdmin);
        }
      } finally {
        setLimitLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setPendingResult(null);
      setScanResult(null);
      setScanError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview || !user) return;
    setIsScanning(true);
    setScanError(null);
    setPendingResult(null);
    setScanResult(null);

    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ image: imagePreview, context }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Scan failed");
      }

      const result: ScanResult = await res.json();
      // Hold result for confirmation — don't save yet
      setPendingResult(result);
    } catch (err: unknown) {
      setScanError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingResult || !user) return;
    setScanResult(pendingResult);
    setPendingResult(null);
    await saveScan(pendingResult, user.uid, context);
    setRemaining((prev) => Math.max(0, prev - 1));
  };

  const handleDeny = () => {
    setPendingResult(null);
    // Keep image + context so they can adjust and retry
  };

  const resetScan = () => {
    setImagePreview(null);
    setPendingResult(null);
    setScanResult(null);
    setScanError(null);
    setContext("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      {cameraOpen && (
        <CameraModal
          onCapture={(dataURI) => {
            setImagePreview(dataURI);
            setPendingResult(null);
            setScanResult(null);
            setScanError(null);
            setCameraOpen(false);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      <div>
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-white text-2xl font-extrabold">
            Hey, {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "friend"}
          </h1>
          <p className="text-gray-500 text-sm">What are you eating today?</p>
        </div>

        {/* Daily scan counter */}
        {!limitLoading && (
          <div className="mb-4">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                Admin — unlimited scans
              </span>
            ) : limitReached ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                Daily limit reached
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-gray-400 border border-white/15">
                {remaining}/{DAILY_SCAN_LIMIT} scans remaining today
              </span>
            )}
          </div>
        )}

        {/* Image capture area */}
        <div className="bg-white/8 backdrop-blur border border-white/15 rounded-2xl p-5 mb-4">
          {imagePreview ? (
            <div className="space-y-3">
              <img
                src={imagePreview}
                alt="Food preview"
                className="w-full rounded-xl object-cover max-h-56"
              />
              <button
                type="button"
                onClick={resetScan}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors"
              >
                ✕ Remove photo
              </button>
            </div>
          ) : limitReached ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-gray-400 text-sm font-semibold">
                You've used all {DAILY_SCAN_LIMIT} scans for today.
              </p>
              <p className="text-gray-600 text-xs">Come back tomorrow!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Scan Food Item
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-600 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-gray-400 text-sm py-2 hover:text-white transition-colors"
              >
                Upload from gallery
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Context input */}
        <div className="mb-4">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Any additional context? (e.g. 'this croissant is from Starbucks')"
            rows={2}
            className="w-full bg-gray-800/70 border border-white/15 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Scan button (visible when image selected, no pending/confirmed result) */}
        {imagePreview && !pendingResult && !scanResult && (
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning || limitReached}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 transition-opacity"
          >
            {isScanning ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : limitReached ? (
              "Daily limit reached"
            ) : (
              "Analyze Calories"
            )}
          </button>
        )}

        {/* Error */}
        {scanError && (
          <p className="text-red-400 text-sm text-center mt-3">{scanError}</p>
        )}

        {/* Confirmation card — "Is this the right food?" */}
        {pendingResult && (
          <div className="mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 space-y-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Looks like…</p>
              <h3 className="text-white text-2xl font-extrabold">
                {pendingResult.foodName}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Is that right? Help me get the calories spot on.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Yep, that's it
              </button>
              <button
                type="button"
                onClick={handleDeny}
                className="flex-1 bg-white/8 border border-white/15 text-gray-300 font-semibold py-3 rounded-xl hover:bg-white/12 transition-colors"
              >
                Nah, not quite
              </button>
            </div>
          </div>
        )}

        {/* Full result card — shown after confirmation */}
        {scanResult && (
          <div className="mt-4 space-y-3">
            <ScanResultCard result={scanResult} />
            <button
              type="button"
              onClick={resetScan}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-300 transition-colors"
            >
              Scan another item
            </button>
          </div>
        )}
      </div>
    </>
  );
}

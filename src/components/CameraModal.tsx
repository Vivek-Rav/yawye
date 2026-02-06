"use client";

import { useEffect, useRef, useCallback } from "react";

interface CameraModalProps {
  onCapture: (base64DataURI: string) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        // If environment camera fails, fall back to any available camera
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch {
          onClose();
        }
      }
    })();

    return () => {
      active = false;
      stopStream();
    };
  }, [onClose, stopStream]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataURI = canvas.toDataURL("image/jpeg", 0.85);

    stopStream();
    onCapture(dataURI);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
      <div className="w-full max-w-2xl bg-black rounded-2xl overflow-hidden flex flex-col">
        {/* Video */}
        <div className="relative" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Viewfinder overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/40 rounded-2xl" />
          </div>
          {/* Close button */}
          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white w-9 h-9 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Capture button bar */}
        <div className="flex items-center justify-center py-5 bg-black/80">
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
          >
            <div className="w-12 h-12 bg-white rounded-full" />
          </button>
        </div>
      </div>
    </div>
  );
}

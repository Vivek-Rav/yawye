import { NextResponse } from "next/server";
import { verifyToken, getDailyScanCountAdmin, isValidTimezone } from "@/lib/firebaseAdmin";

const DAILY_SCAN_LIMIT = 3;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = await verifyToken(token);
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawTz = request.headers.get("x-timezone") || "UTC";
    const timezone = isValidTimezone(rawTz) ? rawTz : "UTC";

    const isAdmin = identity.email === process.env.ADMIN_EMAIL;
    const todayCount = await getDailyScanCountAdmin(identity.uid, timezone);
    const remaining = Math.max(0, DAILY_SCAN_LIMIT - todayCount);

    return NextResponse.json({ remaining, isAdmin });
  } catch (err: unknown) {
    console.error("Scan limit check error:", err);
    return NextResponse.json(
      { error: "Failed to check scan limit" },
      { status: 500 }
    );
  }
}

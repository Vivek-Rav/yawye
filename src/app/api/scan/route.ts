import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_PROMPT_TEMPLATE, parseGeminiResponse } from "@/lib/gemini";
import { stripDataURIPrefix } from "@/lib/utils";
import { verifyToken, getDailyScanCountAdmin, isValidTimezone } from "@/lib/firebaseAdmin";

// --- in-memory rate limiter (per serverless instance, keyed by uid) ---
const rateLimits = new Map<string, { count: number; start: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const DAILY_SCAN_LIMIT = 3;

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(uid);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    rateLimits.set(uid, { count: 1, start: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: Request) {
  try {
    // --- auth ---
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
    const { uid, email } = identity;

    // --- rate limit (per-minute, in-memory) ---
    if (isRateLimited(uid)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // --- reject oversized payloads before parsing ---
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 6_000_000) {
      return NextResponse.json(
        { error: "Request too large" },
        { status: 413 }
      );
    }

    // --- resolve client timezone (fallback to UTC) ---
    const rawTz = request.headers.get("x-timezone") || "UTC";
    const timezone = isValidTimezone(rawTz) ? rawTz : "UTC";

    // --- daily scan limit (skip for admin) ---
    const isAdmin = email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      const todayCount = await getDailyScanCountAdmin(uid, timezone);
      if (todayCount >= DAILY_SCAN_LIMIT) {
        return NextResponse.json(
          { error: "Daily scan limit reached. You can scan up to 3 times per day." },
          { status: 429 }
        );
      }
    }

    // --- parse body (catch malformed JSON) ---
    let body: { image?: string; context?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { image, context } = body as { image: string; context?: string };

    // --- input validation ---
    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }
    if (image.length > 5_000_000) {
      return NextResponse.json(
        { error: "Image too large" },
        { status: 413 }
      );
    }
    if (context && context.length > 500) {
      return NextResponse.json(
        { error: "Context too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // --- sanitize context (strip control chars, template syntax, and structural chars) ---
    const sanitizedContext = (context || "")
      .replace(/[\x00-\x1f\x7f]/g, "") // strip control characters
      .replace(/[{}[\]`]/g, "")         // strip braces and backticks
      .replace(/\$\{/g, "")            // strip template literal syntax
      .trim()
      .slice(0, 500);                  // enforce max length after sanitization

    // --- API key check ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // --- validate image format ---
    if (!/^data:image\/(jpeg|png|gif|webp|heic|heif);base64,/.test(image)) {
      return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const { base64, mimeType } = stripDataURIPrefix(image);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = GEMINI_PROMPT_TEMPLATE.replace(
      "${userContext}",
      sanitizedContext
    );

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
      { text: prompt },
    ]);

    const rawText = response.response.text();
    const result = parseGeminiResponse(rawText);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_PROMPT_TEMPLATE, parseGeminiResponse } from "@/lib/gemini";
import { stripDataURIPrefix } from "@/lib/utils";
import { verifyToken, getDailyScanCountAdmin } from "@/lib/firebaseAdmin";

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

    // --- daily scan limit (skip for admin) ---
    const isAdmin = email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      const todayCount = await getDailyScanCountAdmin(uid);
      if (todayCount >= DAILY_SCAN_LIMIT) {
        return NextResponse.json(
          { error: "Daily scan limit reached. You can scan up to 3 times per day." },
          { status: 429 }
        );
      }
    }

    // --- parse body ---
    const { image, context } = (await request.json()) as {
      image: string;
      context?: string;
    };

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

    // --- sanitize context (strip control chars, limit to food-related input) ---
    const sanitizedContext = (context || "")
      .replace(/[\x00-\x1f\x7f]/g, "") // strip control characters
      .replace(/[{}[\]]/g, "")          // strip braces that could break JSON prompt
      .trim();

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

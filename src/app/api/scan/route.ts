import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_PROMPT_TEMPLATE, parseGeminiResponse } from "@/lib/gemini";
import { stripDataURIPrefix } from "@/lib/utils";
import { verifyToken } from "@/lib/firebaseAdmin";

// --- in-memory rate limiter (per serverless instance, keyed by uid) ---
const rateLimits = new Map<string, { count: number; start: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;

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

    const uid = await verifyToken(token);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- rate limit ---
    if (isRateLimited(uid)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
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

    // --- API key check ---
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const { base64, mimeType } = stripDataURIPrefix(image);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = GEMINI_PROMPT_TEMPLATE.replace(
      "${userContext}",
      context || ""
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

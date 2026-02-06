export interface ScanResult {
  foodName: string;
  calories: number;
  ingredients: string[];
  riskLevel: "high" | "medium" | "low";
  riskReason: string;
  humorComment: string;
  brandNote: string | null;
}

export const GEMINI_PROMPT_TEMPLATE = `You are a food identification and nutrition expert. Be as exact and precise as possible with calorie counts.

PRECISION RULES you MUST follow:
- If you recognise a specific branded or manufactured product AND you know its published nutritional data (e.g. from the brand's website, packaging, or a well-known nutrition database), use that exact figure. Do NOT guess or round when real data is available.
- If you can identify the brand but do NOT have confident knowledge of its published calorie count, your best estimate is fine — but you MUST flag it as an estimate in brandNote so the user knows.
- For generic / unbranded foods, use standard USDA or equivalent reference values where possible, and note when you are estimating.

SERVING SIZE RULES you MUST follow:
- The calorie count MUST be for the entire item as the user would eat it in one go — NOT per 100g, unless the image clearly shows a large bulk container.
- Single-serve packets, sachets, pouches, bars, cups, pods, or individual portions: return calories for the WHOLE packet/item. For example, if a sachet is 40g and the nutrition label says 226 kcal per sachet, return 226 — do NOT convert to per-100g.
- If the image shows multiple servings or a larger package, estimate how much the user likely consumed and use that.
- State the serving size you used in brandNote (e.g. "per 40g sachet") so the user can verify.

Analyze the food in this image and respond with ONLY a valid JSON object — no markdown, no code fences, no extra text.

If the user provided additional context, use it to refine your answer (e.g., if they say "this is from Starbucks", use Starbucks-specific portion sizes and recipes).

Additional context from user: "\${userContext}"

Return this exact JSON shape:
{
  "foodName": "<name of the food, e.g. Croissant or Chicken Caesar Salad. If a brand is detected, include it, e.g. 'Nespresso Livanto Pod'>",
  "calories": <integer — use the manufacturer's published per-serving calories if this is a known branded product and you are confident in that number; otherwise use your best estimate based on standard reference values>,
  "ingredients": ["<ingredient1>", "<ingredient2>"],
  "riskLevel": "<exactly one of: high, medium, low>",
  "riskReason": "<one sentence explaining why this risk level was assigned>",
  "humorComment": "<a mildly humorous, lighthearted comment about this food. Keep it fun and under 20 words. Never be mean-spirited or offensive.>",
  "brandNote": "<If you can identify a specific brand or manufactured product: (1) name the brand and product, (2) state the serving size you used (e.g. 'per 40g sachet', 'per pod', 'per 1 bar'), (3) state whether the calorie count is from the manufacturer's published nutrition info or is an estimate — be explicit, e.g. 'Calories are from published data (226 kcal per sachet)' or 'No published data found; calorie count is an estimate', (4) briefly explain how this branded product may differ nutritionally from the generic base food. If no specific brand is detected, set this to null>"
}

Risk classification rules you MUST follow:
- high: fast food, fried foods, highly processed foods, candy, pastries with heavy sugar/fat, sodas
- medium: meats, dairy, mixed restaurant dishes, bread, rice dishes
- low: vegetables, fruits, whole grains, lean proteins, nuts in small portions

If you cannot identify any food in the image, return:
{
  "foodName": "Mystery Bites",
  "calories": 0,
  "ingredients": [],
  "riskLevel": "medium",
  "riskReason": "Could not identify the food in the image",
  "humorComment": "Even I need my reading glasses sometimes. Try a clearer photo!",
  "brandNote": null
}`;

export function parseGeminiResponse(rawText: string): ScanResult {
  const cleaned = rawText
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/gi, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  if (
    !parsed.foodName ||
    parsed.calories === undefined ||
    !Array.isArray(parsed.ingredients) ||
    !["high", "medium", "low"].includes(parsed.riskLevel) ||
    !parsed.riskReason ||
    !parsed.humorComment
  ) {
    throw new Error("Gemini response missing required fields");
  }

  return {
    foodName: parsed.foodName,
    calories: Number(parsed.calories),
    ingredients: parsed.ingredients,
    riskLevel: parsed.riskLevel as ScanResult["riskLevel"],
    riskReason: parsed.riskReason,
    humorComment: parsed.humorComment,
    brandNote: parsed.brandNote ?? null,
  };
}

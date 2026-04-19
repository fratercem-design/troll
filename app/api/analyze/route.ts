import { NextRequest, NextResponse } from "next/server";
import { AnalysisResultSchema } from "@/lib/schemas";
import { Rule } from "@/lib/store";

const MANUS_API_KEY = process.env.MANUS_API_KEY!;
const MANUS_API_URL =
  process.env.MANUS_API_URL ||
  "https://api.manus.im/v1/chat/completions";
const MANUS_MODEL = process.env.MANUS_MODEL || "claude-sonnet-4-5";

export async function POST(req: NextRequest) {
  try {
    const { comment, rules } = (await req.json()) as {
      comment: string;
      rules: Rule[];
    };

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: "Comment is required" },
        { status: 400 }
      );
    }

    if (!MANUS_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const rulesText =
      rules.length > 0
        ? rules
            .map(
              (r) =>
                `- ${r.title}: ${r.description} (default action: ${r.default_action})`
            )
            .join("\n")
        : "- No specific rules defined. Use general community standards.";

    const prompt = `You are an expert online community moderator and behavioral analyst. Analyze the following comment and return a JSON response.

Community Rules:
${rulesText}

Comment to analyze: "${comment}"

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "translation_plain": "Plain English explanation of what the comment really means",
  "translation_intent": "The underlying psychological intent or goal of the commenter",
  "likely_goal": "One short phrase (3-5 words) describing their goal",
  "risk": {
    "level": "high",
    "reasons": ["reason 1", "reason 2"],
    "contains_hate_or_slur": false,
    "contains_threat": false,
    "sexual_harassment": false
  },
  "tactics": [
    {
      "name": "tactic name",
      "confidence": 0.85,
      "evidence_phrases": ["exact phrase from the comment"]
    }
  ],
  "recommended_action": {
    "primary": "warn",
    "why": "Brief explanation of why this action is recommended"
  },
  "replies": {
    "firm_boundary": "A firm but professional moderator response",
    "de_escalation": "A calm, de-escalating response",
    "educational": "An educational response explaining the rule"
  },
  "coach_notes": ["Moderator insight 1", "Moderator insight 2"]
}

Risk level must be "high", "medium", or "low". Recommended action primary must be one of: "warn", "timeout", "ban", "none".`;

    const response = await fetch(MANUS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MANUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: MANUS_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manus API error:", response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response content from API" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content);
    const result = AnalysisResultSchema.parse(parsed);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse API response" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

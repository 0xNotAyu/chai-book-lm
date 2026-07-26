import { NextResponse } from "next/server";
import { openai, CHAT_MODEL } from "@/lib/openai";
import { vectorService } from "@/services/vector.service";

type RouteParams = { params: Promise<{ notebookId: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { notebookId } = await params;
    const chunks = await vectorService.getNotebookChunks(notebookId, 20);
    if (chunks.length === 0) return NextResponse.json({ questions: [] });

    const context = chunks.map((c) => c.text).join("\n\n").slice(0, 6000);

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.5,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
            },
            required: ["questions"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Given excerpts from a knowledge base, write 3-5 short, specific questions a curious user " +
            "would want to ask. Keep each under 10 words. Respond ONLY with the structured JSON.",
        },
        { role: "user", content: context },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return NextResponse.json({ questions: parsed.questions ?? [] });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json({ questions: [] });
  }
}
import { LineValue } from "../data/hexagrams";
import { buildInterpretationPrompt } from "../lib/divination";

export async function interpretHexagram(question: string, lines: LineValue[]) {
  const prompt = buildInterpretationPrompt(question, lines);

  try {
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.interpretation;
  } catch (error: unknown) {
    console.error("Error generating interpretation:", error);
    const message = error instanceof Error ? error.message : "解卦失败，请稍后再试。";
    throw new Error(message);
  }
}

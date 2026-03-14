import { LineValue } from "../data/hexagrams";
import { buildInterpretationPrompt } from "../lib/divination";

interface InterpretOptions {
  onChunk?: (chunk: string, fullText: string) => void;
  castedAt?: string | null;
}

export async function interpretHexagram(question: string, lines: LineValue[], options: InterpretOptions = {}) {
  const prompt = buildInterpretationPrompt(question, lines, { castedAt: options.castedAt });

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

    if (!response.body) {
      throw new Error("服务端未返回可读取的流。");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let interpretation = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) {
        continue;
      }

      interpretation += chunk;
      options.onChunk?.(chunk, interpretation);
    }

    interpretation += decoder.decode();
    if (!interpretation.trim()) {
      throw new Error("解卦结果为空。");
    }

    options.onChunk?.("", interpretation);
    return interpretation;
  } catch (error: unknown) {
    console.error("Error generating interpretation:", error);
    const message = error instanceof Error ? error.message : "解卦失败，请稍后再试。";
    throw new Error(message);
  }
}

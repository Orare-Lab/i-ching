export interface ParsedInterpretation {
  answer: string;
  reasoning: string;
  isReasoningPending: boolean;
}

export function parseInterpretation(raw: string): ParsedInterpretation {
  if (!raw) {
    return {
      answer: "",
      reasoning: "",
      isReasoningPending: false,
    };
  }

  const closedThinkPattern = /<think>([\s\S]*?)<\/think>/gi;
  const reasoningParts = Array.from(raw.matchAll(closedThinkPattern), (match) => match[1].trim()).filter(Boolean);
  let answer = raw.replace(closedThinkPattern, "").trim();
  let reasoning = reasoningParts.join("\n\n").trim();
  let isReasoningPending = false;

  const lastOpenIndex = raw.lastIndexOf("<think>");
  const lastCloseIndex = raw.lastIndexOf("</think>");
  if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
    isReasoningPending = true;
    reasoning = `${reasoning}\n\n${raw.slice(lastOpenIndex + "<think>".length).trim()}`.trim();
    answer = raw.slice(0, lastOpenIndex).replace(closedThinkPattern, "").trim();
  }

  return {
    answer,
    reasoning,
    isReasoningPending,
  };
}

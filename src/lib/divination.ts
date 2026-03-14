import { getGuaci, getYaoci } from "../data/ichingTexts";
import { LineValue, parseHexagram } from "../data/hexagrams";
import { getDayStemForDate } from "./hexagramAnnotations";

export type CoinValue = 0 | 1;
export type CoinTriple = [CoinValue, CoinValue, CoinValue];

export function generateLine(): { coins: CoinTriple; score: LineValue } {
  const coins: CoinTriple = [
    Math.floor(Math.random() * 2) as CoinValue,
    Math.floor(Math.random() * 2) as CoinValue,
    Math.floor(Math.random() * 2) as CoinValue,
  ];

  const score = coins.reduce((total, coin) => total + (coin === 1 ? 3 : 2), 0) as LineValue;
  return { coins, score };
}

interface PromptOptions {
  castedAt?: string | null;
}

function formatLineAnnotations(
  title: string,
  lines: ReturnType<typeof parseHexagram>["originalLines"],
) {
  const details = lines
    .map((line) => {
      const naJia = line.annotation.earthlyBranch && line.annotation.element
        ? `${line.annotation.heavenlyStem ?? ""}${line.annotation.earthlyBranch}${line.annotation.element}`
        : "待定";
      return `- 第${line.lineNumber}爻（${line.label}）：六亲=${line.annotation.sixRelative ?? "待定"}，六神=${line.annotation.sixSpirit ?? "待定"}，纳甲=${naJia}`;
    })
    .join("\n");

  return `- ${title}：\n${details}`;
}

export function buildInterpretationPrompt(question: string, lines: LineValue[], options: PromptOptions = {}) {
  const sanitizedQuestion = question.trim() || "无特定问题，求测近期运势";
  const computationDate = options.castedAt ? new Date(options.castedAt) : new Date();
  const { originalBinary, changedBinary, originalName, changedName, movingLines, originalLines, changedLines } = parseHexagram(lines, {
    dayStem: getDayStemForDate(computationDate),
  });
  const originalGuaci = getGuaci(originalBinary);
  const changedGuaci = movingLines.length > 0 ? getGuaci(changedBinary) : "无变卦（六爻皆静）";

  const movingYaoci =
    movingLines.length > 0
      ? movingLines.map((lineNumber) => `- 第${lineNumber}爻：${getYaoci(originalBinary, lineNumber - 1)}`).join("\n")
      : "- 无动爻";

  const changedYaoci =
    movingLines.length > 0
      ? movingLines.map((lineNumber) => `- 第${lineNumber}爻：${getYaoci(changedBinary, lineNumber - 1)}`).join("\n")
      : "- 无";

  return `你是一位精通《易经》的国学大师。用户使用“三钱法”摇了一卦。
用户的问题是：“${sanitizedQuestion}”

起卦结果如下：
- 本卦：${originalName}
- 变卦：${movingLines.length > 0 ? changedName : "无变卦（六爻皆静）"}
- 动爻：${movingLines.length > 0 ? `第 ${movingLines.join(", ")} 爻` : "无"}
${formatLineAnnotations("本卦六爻信息", originalLines)}
${formatLineAnnotations("变卦六爻信息", changedLines)}

卦辞爻辞信息如下：
- 本卦卦辞：${originalGuaci}
- 本卦动爻爻辞：
${movingYaoci}
- 变卦卦辞：${changedGuaci}
- 变卦对应爻辞：
${changedYaoci}

请根据易经的卦辞、爻辞以及本卦变卦的关系，为用户进行详细、客观、富有哲理的解卦。
要求：
1. 语言风格古雅且通俗易懂。
2. 先解释本卦的总体含义。
3. 如果有动爻，重点解释动爻的爻辞及其带来的变化（变卦的含义）。
4. 结合用户的问题，给出具体的建议和启示。
5. 排版清晰，使用 Markdown 格式。`;
}

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
  stage?: "basic" | "deep" | "technical";
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

function buildBasicInterpretationPrompt({
  sanitizedQuestion,
  originalName,
  changedName,
  movingLines,
  originalLines,
  changedLines,
  originalGuaci,
  movingYaoci,
  changedGuaci,
  changedYaoci,
}: {
  sanitizedQuestion: string;
  originalName: string;
  changedName: string;
  movingLines: number[];
  originalLines: ReturnType<typeof parseHexagram>["originalLines"];
  changedLines: ReturnType<typeof parseHexagram>["changedLines"];
  originalGuaci: string;
  movingYaoci: string;
  changedGuaci: string;
  changedYaoci: string;
}) {
  return `你是一位擅长把《易经》讲得明白、自然、不故作玄虚的六爻解读者。
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

请给出第一阶段解卦，目标读者是普通用户，不要求懂术语。

要求：
1. 语言尽量白话，少用术语；如果必须用术语，要立刻解释。
2. 先直接回答用户最关心的结论，再解释为什么。
3. 重点解释“现在是什么情况”“哪里在变化”“接下来会怎么发展”。
4. 如果有动爻，只抓最关键的动爻，不要把内容讲散。
5. 建议要具体、可执行，避免空泛劝告。
6. 使用 Markdown，结构清晰，建议包含：
   - 一句话结论
   - 当前局面
   - 变化重点
   - 给你的建议
7. 不要长篇照抄卦辞爻辞原文，不要写得像论文。`;
}

function buildDeepInterpretationPrompt({
  sanitizedQuestion,
  originalName,
  changedName,
  movingLines,
  originalLines,
  changedLines,
  originalGuaci,
  movingYaoci,
  changedGuaci,
  changedYaoci,
}: {
  sanitizedQuestion: string;
  originalName: string;
  changedName: string;
  movingLines: number[];
  originalLines: ReturnType<typeof parseHexagram>["originalLines"];
  changedLines: ReturnType<typeof parseHexagram>["changedLines"];
  originalGuaci: string;
  movingYaoci: string;
  changedGuaci: string;
  changedYaoci: string;
}) {
  return `你是一位精通《易经》与六爻体系的解卦者。请针对已经完成第一阶段浅显解读的同一用户，提供第二阶段深度解卦。
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

请提供第二阶段深度解卦。

要求：
1. 默认用户已经看过浅显版，因此这里不要重复浅显版的大段结论。
2. 重点深入解释卦辞、动爻爻辞、变卦之间的关系。
3. 说明你为什么得出这个判断，给出推演链条。
4. 可以适度使用术语，但必须解释清楚，不要堆术语。
5. 结构建议包含：
   - 卦意总纲
   - 卦辞怎么落到这个问题上
   - 动爻为何关键
   - 变卦说明了什么后势
   - 六亲、六神、纳甲中最值得注意的点
   - 对第一阶段结论的补充或修正
6. 使用 Markdown，内容允许更长、更细，但仍要让用户能读懂。`;
}

function buildTechnicalInterpretationPrompt({
  sanitizedQuestion,
  originalName,
  changedName,
  movingLines,
  originalLines,
  changedLines,
  originalGuaci,
  movingYaoci,
  changedGuaci,
  changedYaoci,
}: {
  sanitizedQuestion: string;
  originalName: string;
  changedName: string;
  movingLines: number[];
  originalLines: ReturnType<typeof parseHexagram>["originalLines"];
  changedLines: ReturnType<typeof parseHexagram>["changedLines"];
  originalGuaci: string;
  movingYaoci: string;
  changedGuaci: string;
  changedYaoci: string;
}) {
  return `你是一位熟悉六爻术数细节的解卦者。请针对已经看过浅显解读和深度解读的用户，提供第三阶段“术数细读”。
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

请提供第三阶段术数细读。

要求：
1. 面向愿意看术数细节的进阶用户，但仍要尽量写清楚，不要故弄玄虚。
2. 重点解释六亲、六神、纳甲在这次判断里的作用，哪些信息只是背景，哪些信息真正影响结论。
3. 如果有动爻，说明它与六亲、六神、纳甲之间的呼应关系。
4. 如果无动爻，要说明六爻皆静时术数判断的重点转向哪里。
5. 说明哪些术数信息支持前两阶段结论，哪些地方只是辅助参考，避免写成“万物皆可解释”。
6. 建议结构：
   - 术数总览
   - 六亲细读
   - 六神细读
   - 纳甲与地支五行细读
   - 哪些术数信息最关键
   - 对前两阶段解读的术数校验
7. 使用 Markdown。允许更专业，但必须解释清楚，不要堆砌术语。`;
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

  /*
  旧版 Prompt 保留如下，后续如果需要回滚可直接恢复：

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
  */

  if (options.stage === "deep") {
    return buildDeepInterpretationPrompt({
      sanitizedQuestion,
      originalName,
      changedName,
      movingLines,
      originalLines,
      changedLines,
      originalGuaci,
      movingYaoci,
      changedGuaci,
      changedYaoci,
    });
  }

  if (options.stage === "technical") {
    return buildTechnicalInterpretationPrompt({
      sanitizedQuestion,
      originalName,
      changedName,
      movingLines,
      originalLines,
      changedLines,
      originalGuaci,
      movingYaoci,
      changedGuaci,
      changedYaoci,
    });
  }

  return buildBasicInterpretationPrompt({
    sanitizedQuestion,
    originalName,
    changedName,
    movingLines,
    originalLines,
    changedLines,
    originalGuaci,
    movingYaoci,
    changedGuaci,
    changedYaoci,
  });
}

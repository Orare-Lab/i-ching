import { LineValue, parseHexagram } from "../data/hexagrams";

export async function interpretHexagram(question: string, lines: LineValue[]) {
  const { originalName, changedName, movingLines } = parseHexagram(lines);
  
  let prompt = `你是一位精通《易经》的国学大师。用户使用“三钱法”摇了一卦。
用户的问题是：“${question || "无特定问题，求测近期运势"}”

起卦结果如下：
- 本卦：${originalName}
- 变卦：${movingLines.length > 0 ? changedName : "无变卦（六爻皆静）"}
- 动爻：${movingLines.length > 0 ? `第 ${movingLines.join(', ')} 爻` : "无"}

请根据易经的卦辞、爻辞以及本卦变卦的关系，为用户进行详细、客观、富有哲理的解卦。
要求：
1. 语言风格古雅且通俗易懂。
2. 先解释本卦的总体含义。
3. 如果有动爻，重点解释动爻的爻辞及其带来的变化（变卦的含义）。
4. 结合用户的问题，给出具体的建议和启示。
5. 排版清晰，使用 Markdown 格式。`;

  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const baseURL = import.meta.env.VITE_OPENAI_BASE_URL || "https://api.openai.com/v1";
    const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o";

    if (!apiKey) {
      throw new Error("未配置 VITE_OPENAI_API_KEY，请在环境变量中设置。");
    }

    const response = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "你是一位精通《易经》的国学大师。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", errorData);
      throw new Error(`API 请求失败: ${response.status} ${errorData.error?.message || ''}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("Error generating interpretation:", error);
    throw new Error(error.message || "解卦失败，请稍后再试。");
  }
}

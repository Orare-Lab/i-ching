function getPrompt(body) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    } catch {
      return "";
    }
  }

  return typeof body?.prompt === "string" ? body.prompt.trim() : "";
}

export default async function interpretHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "仅支持 POST 请求。" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const prompt = getPrompt(req.body);

  if (!apiKey) {
    return res.status(500).json({ error: "服务端未配置 OPENAI_API_KEY。" });
  }

  if (!prompt) {
    return res.status(400).json({ error: "缺少解卦 prompt。" });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "你是一位严谨、克制、熟悉《易经》原典与象数义理的解卦者。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || `上游接口请求失败: ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "上游接口未返回有效内容。" });
    }

    return res.json({ interpretation: content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解卦服务异常。";
    return res.status(500).json({ error: message });
  }
}

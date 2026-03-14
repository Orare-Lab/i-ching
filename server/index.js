import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: "1mb" }));

app.post("/api/interpret", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";

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
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`I Ching server listening on http://localhost:${port}`);
});

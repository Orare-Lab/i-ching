import { getAuthenticatedSession } from "./auth";
import { RequestLike, ResponseLike } from "./http";

function getPrompt(body: unknown) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { prompt?: string };
      return typeof parsed?.prompt === "string" ? parsed.prompt.trim() : "";
    } catch {
      return "";
    }
  }

  if (typeof body === "object" && body !== null && "prompt" in body) {
    const prompt = (body as { prompt?: unknown }).prompt;
    return typeof prompt === "string" ? prompt.trim() : "";
  }

  return "";
}

function normalizeApiPath(path: string | undefined) {
  const trimmed = (path || "").trim();
  if (!trimmed) {
    return "/chat/completions";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getApiStyle(apiPath: string) {
  const configured = (process.env.OPENAI_API_STYLE || "").trim().toLowerCase();
  if (configured === "chat" || configured === "responses") {
    return configured;
  }

  return apiPath.includes("/responses") ? "responses" : "chat";
}

function buildRequestBody({ apiStyle, model, prompt }: { apiStyle: string; model: string; prompt: string }) {
  if (apiStyle === "responses") {
    return {
      model,
      temperature: 0.7,
      stream: true,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    };
  }

  return {
    model,
    temperature: 0.7,
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };
}

function extractTextFromValue(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => extractTextFromValue((item as { text?: unknown; content?: unknown })?.text || (item as { text?: unknown; content?: unknown })?.content || item)).join("");
  }
  if (typeof value === "object") {
    const objectValue = value as { text?: unknown; content?: unknown };
    return extractTextFromValue(objectValue.text || objectValue.content);
  }
  return "";
}

function extractStreamDelta(parsed: any, apiStyle: string) {
  if (apiStyle === "responses") {
    if (parsed?.type === "response.output_text.delta") {
      return parsed.delta || "";
    }

    return "";
  }

  const delta = parsed?.choices?.[0]?.delta;
  return extractTextFromValue(delta?.content);
}

function extractNonStreamText(data: any, apiStyle: string) {
  if (apiStyle === "responses") {
    return (
      data?.output_text ||
      data?.output?.map((item: any) => extractTextFromValue(item?.content)).join("") ||
      ""
    );
  }

  return extractTextFromValue(data?.choices?.[0]?.message?.content);
}

async function readErrorPayload(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) {
    return `上游接口请求失败: ${response.status}`;
  }

  try {
    const data = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return data?.error?.message || data?.message || `上游接口请求失败: ${response.status}`;
  } catch {
    return text;
  }
}

async function streamUpstreamResponse(response: Response, res: ResponseLike, apiStyle: string) {
  if (!response.body) {
    const text = extractNonStreamText(await response.json().catch(() => ({})), apiStyle);
    if (!text) {
      throw new Error("上游接口未返回有效内容。");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(text);
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const decoder = new TextDecoder();
  let buffer = "";
  let receivedContent = false;

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of event.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }

        const payload = trimmed.slice(5).trim();
        if (!payload) {
          continue;
        }

        if (payload === "[DONE]") {
          if (!receivedContent) {
            throw new Error("上游接口未返回有效内容。");
          }
          res.end();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const delta = extractStreamDelta(parsed, apiStyle);
          if (delta) {
            receivedContent = true;
            res.write(delta);
          }
        } catch {
          // Ignore keepalive and provider-specific non-JSON chunks.
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(payload);
        const delta = extractStreamDelta(parsed, apiStyle);
        if (delta) {
          receivedContent = true;
          res.write(delta);
        }
      } catch {
        // Ignore invalid trailing fragments.
      }
    }
  }

  if (!receivedContent) {
    throw new Error("上游接口未返回有效内容。");
  }

  res.end();
}

export default async function interpretHandler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "仅支持 POST 请求。" });
  }

  if (!getAuthenticatedSession(req)) {
    return res.status(401).json({ error: "请先输入有效邀请码。" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiPath = normalizeApiPath(process.env.OPENAI_API_PATH);
  const apiStyle = getApiStyle(apiPath);
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const prompt = getPrompt(req.body);

  if (!apiKey) {
    return res.status(500).json({ error: "服务端未配置 OPENAI_API_KEY。" });
  }

  if (!prompt) {
    return res.status(400).json({ error: "缺少解卦 prompt。" });
  }

  try {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildRequestBody({ apiStyle, model, prompt })),
    });

    if (!response.ok) {
      const message = await readErrorPayload(response);
      return res.status(response.status).json({ error: message });
    }

    await streamUpstreamResponse(response, res, apiStyle);
    return undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : "解卦服务异常。";
    if (res.headersSent) {
      res.end();
      return undefined;
    }

    return res.status(500).json({ error: message });
  }
}

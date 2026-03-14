import crypto from "node:crypto";

interface RequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  headersSent?: boolean;
  status(code: number): ResponseLike;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  write(chunk: string): void;
}

function parseInviteCodes() {
  return new Set(
    (process.env.INVITE_CODES || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean),
  );
}

function parseCookies(req: RequestLike) {
  const header = req.headers?.cookie;
  if (!header || Array.isArray(header)) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function sign(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.OPENAI_API_KEY || "dev-session-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function getAuthenticatedSession(req: RequestLike) {
  const token = parseCookies(req).iching_session;
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      inviteCode?: string;
      exp?: number;
    };

    if (!payload.inviteCode || typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }

    if (!parseInviteCodes().has(payload.inviteCode)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

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
  return trimmed ? (trimmed.startsWith("/") ? trimmed : `/${trimmed}`) : "/chat/completions";
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
    return parsed?.type === "response.output_text.delta" ? parsed.delta || "" : "";
  }

  return extractTextFromValue(parsed?.choices?.[0]?.delta?.content);
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
    const data = await response.json().catch(() => ({}));
    const content =
      apiStyle === "responses"
        ? data?.output_text || data?.output?.map((item: any) => extractTextFromValue(item?.content)).join("") || ""
        : extractTextFromValue(data?.choices?.[0]?.message?.content);

    if (!content) {
      throw new Error("上游接口未返回有效内容。");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(content);
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedContent = false;

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
          // Ignore non-JSON keepalive chunks.
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  if (!receivedContent) {
    throw new Error("上游接口未返回有效内容。");
  }

  res.end();
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "仅支持 POST 请求。" });
    }

    if (!getAuthenticatedSession(req)) {
      return res.status(401).json({ error: "请先输入有效邀请码。" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = getPrompt(req.body);
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const apiPath = normalizeApiPath(process.env.OPENAI_API_PATH);
    const apiStyle = getApiStyle(apiPath);
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    if (!apiKey) {
      return res.status(500).json({ error: "服务端未配置 OPENAI_API_KEY。" });
    }

    if (!prompt) {
      return res.status(400).json({ error: "缺少解卦 prompt。" });
    }

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
    const message = error instanceof Error ? error.message : String(error);
    if (res.headersSent) {
      res.end();
      return undefined;
    }

    return res.status(500).json({ error: "API handler crashed.", detail: message });
  }
}

import crypto from "node:crypto";

interface RequestLike {
  method?: string;
  body?: unknown;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): void;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function parseInviteCodes() {
  return new Set(
    (process.env.INVITE_CODES || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean),
  );
}

function getInviteCode(body: unknown) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { inviteCode?: string };
      return typeof parsed?.inviteCode === "string" ? parsed.inviteCode.trim() : "";
    } catch {
      return "";
    }
  }

  if (typeof body === "object" && body !== null && "inviteCode" in body) {
    const inviteCode = (body as { inviteCode?: unknown }).inviteCode;
    return typeof inviteCode === "string" ? inviteCode.trim() : "";
  }

  return "";
}

function sign(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.OPENAI_API_KEY || "dev-session-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function serializeCookie(name: string, value: string, maxAgeMs: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildSessionToken(inviteCode: string) {
  const payload = {
    inviteCode,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "仅支持 POST 请求。" });
    }

    const inviteCode = getInviteCode(req.body);
    if (!inviteCode) {
      return res.status(401).json({ error: "请输入邀请码。" });
    }

    const inviteCodes = parseInviteCodes();
    if (inviteCodes.size === 0) {
      return res.status(401).json({ error: "服务端未配置邀请码。" });
    }

    if (!inviteCodes.has(inviteCode)) {
      return res.status(401).json({ error: "邀请码无效。" });
    }

    res.setHeader("Set-Cookie", serializeCookie("iching_session", buildSessionToken(inviteCode), SESSION_TTL_MS));
    return res.json({ authenticated: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "API handler crashed.", detail: message });
  }
}

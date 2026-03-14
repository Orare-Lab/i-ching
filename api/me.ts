import crypto from "node:crypto";

interface RequestLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): void;
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

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "仅支持 GET 请求。" });
    }

    return res.json({
      authenticated: Boolean(getAuthenticatedSession(req)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "API handler crashed.", detail: message });
  }
}

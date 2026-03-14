import crypto from "node:crypto";

const SESSION_COOKIE = "iching_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.OPENAI_API_KEY || "dev-session-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseInviteCodes() {
  return new Set(
    (process.env.INVITE_CODES || "")
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean),
  );
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};

  return header.split(";").reduce((cookies, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function serializeCookie(name, value, maxAgeMs) {
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

function buildSessionToken(inviteCode) {
  const payload = {
    inviteCode,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  if (sign(encodedPayload) !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload?.inviteCode || typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function redeemInviteCode(inviteCode) {
  const normalized = typeof inviteCode === "string" ? inviteCode.trim() : "";
  if (!normalized) {
    return { ok: false, error: "请输入邀请码。" };
  }

  if (parseInviteCodes().size === 0) {
    return { ok: false, error: "服务端未配置邀请码。" };
  }

  if (!parseInviteCodes().has(normalized)) {
    return { ok: false, error: "邀请码无效。" };
  }

  return {
    ok: true,
    cookie: serializeCookie(SESSION_COOKIE, buildSessionToken(normalized), SESSION_TTL_MS),
    inviteCode: normalized,
  };
}

export function clearSessionCookie() {
  return `${serializeCookie(SESSION_COOKIE, "", 0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getAuthenticatedSession(req) {
  const session = readSession(req);
  if (!session) return null;

  if (!parseInviteCodes().has(session.inviteCode)) {
    return null;
  }

  return session;
}

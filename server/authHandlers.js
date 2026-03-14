import { clearSessionCookie, getAuthenticatedSession, redeemInviteCode } from "./auth.js";

function getInviteCode(body) {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return typeof parsed?.inviteCode === "string" ? parsed.inviteCode.trim() : "";
    } catch {
      return "";
    }
  }

  return typeof body?.inviteCode === "string" ? body.inviteCode.trim() : "";
}

export async function meHandler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "仅支持 GET 请求。" });
  }

  const session = getAuthenticatedSession(req);
  return res.json({
    authenticated: Boolean(session),
  });
}

export async function redeemInviteHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "仅支持 POST 请求。" });
  }

  const result = redeemInviteCode(getInviteCode(req.body));
  if (!result.ok) {
    return res.status(401).json({ error: result.error });
  }

  res.setHeader("Set-Cookie", result.cookie);
  return res.json({ authenticated: true });
}

export async function logoutHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "仅支持 POST 请求。" });
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  return res.json({ authenticated: false });
}

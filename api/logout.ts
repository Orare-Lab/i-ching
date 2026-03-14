interface RequestLike {
  method?: string;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): void;
}

function clearSessionCookie() {
  const parts = [
    "iching_session=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "仅支持 POST 请求。" });
    }

    res.setHeader("Set-Cookie", clearSessionCookie());
    return res.json({ authenticated: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "API handler crashed.", detail: message });
  }
}

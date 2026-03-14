import { logoutHandler } from "../server/authHandlers";

export default async function handler(req: unknown, res: unknown) {
  return logoutHandler(req as never, res as never);
}

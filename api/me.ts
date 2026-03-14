import { meHandler } from "../server/authHandlers";

export default async function handler(req: unknown, res: unknown) {
  return meHandler(req as never, res as never);
}

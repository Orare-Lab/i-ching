import { redeemInviteHandler } from "../server/authHandlers";

export default async function handler(req: unknown, res: unknown) {
  return redeemInviteHandler(req as never, res as never);
}

import { redeemInviteHandler } from "../server/authHandlers.js";

export default async function handler(req, res) {
  return redeemInviteHandler(req, res);
}

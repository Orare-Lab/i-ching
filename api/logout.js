import { logoutHandler } from "../server/authHandlers.js";

export default async function handler(req, res) {
  return logoutHandler(req, res);
}

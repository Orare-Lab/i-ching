import { meHandler } from "../server/authHandlers.js";

export default async function handler(req, res) {
  return meHandler(req, res);
}

import interpretHandler from "../server/interpretHandler.js";

export default async function handler(req, res) {
  return interpretHandler(req, res);
}

import interpretHandler from "../server/interpretHandler";

export default async function handler(req: unknown, res: unknown) {
  return interpretHandler(req as never, res as never);
}

import { withErrorBoundary } from "./_utils";

export default async function handler(req: unknown, res: unknown) {
  return withErrorBoundary(res as never, async () => {
    const { redeemInviteHandler } = await import("../server/authHandlers");
    return redeemInviteHandler(req as never, res as never);
  });
}

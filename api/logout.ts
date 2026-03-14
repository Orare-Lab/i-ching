import { withErrorBoundary } from "./_utils";

export default async function handler(req: unknown, res: unknown) {
  return withErrorBoundary(res as never, async () => {
    const { logoutHandler } = await import("../server/authHandlers");
    return logoutHandler(req as never, res as never);
  });
}

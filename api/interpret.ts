import { withErrorBoundary } from "./_utils";

export default async function handler(req: unknown, res: unknown) {
  return withErrorBoundary(res as never, async () => {
    const { default: interpretHandler } = await import("../server/interpretHandler");
    return interpretHandler(req as never, res as never);
  });
}

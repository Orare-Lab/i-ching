interface ApiResponseLike {
  status(code: number): ApiResponseLike;
  json(payload: unknown): unknown;
}

export async function withErrorBoundary(
  res: ApiResponseLike,
  run: () => Promise<unknown>,
) {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: "API handler crashed.",
      detail: message,
    });
  }
}

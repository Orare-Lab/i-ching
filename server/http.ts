export interface RequestLike {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ResponseLike {
  headersSent?: boolean;
  status(code: number): ResponseLike;
  json(payload: unknown): unknown;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
  write(chunk: string): void;
  flushHeaders?: () => void;
  sendFile?: (path: string) => void;
}

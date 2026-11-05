import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function getRequestId(req: Request): string {
  const supplied = req.header('x-request-id');
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
}

export const requestObservability: RequestHandler = (req, res, next) => {
  const requestId = getRequestId(req);
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(JSON.stringify({
      event: 'http.request',
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userId: res.locals.userId || undefined,
    }));
  });
  next();
};

export function logRequestError(
  event: string,
  req: Request,
  error: unknown,
  details: Record<string, unknown> = {},
): void {
  console.error(JSON.stringify({
    event,
    requestId: req.res?.locals.requestId,
    message: error instanceof Error ? error.message : String(error),
    ...details,
  }));
}

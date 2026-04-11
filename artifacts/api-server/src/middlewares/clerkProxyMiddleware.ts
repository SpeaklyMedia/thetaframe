import { createProxyMiddleware } from "http-proxy-middleware";
import type { Request, Response, RequestHandler } from "express";
import type { ClientRequest, IncomingMessage } from "http";

export const CLERK_PROXY_PATH = "/api/__clerk";

export function clerkProxyMiddleware(): RequestHandler {
  const target = process.env.CLERK_PROXY_TARGET?.trim();
  if (!target) {
    return (_req: Request, _res: Response, next: (err?: unknown) => void) =>
      next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req: Request, _res: Response, next: (err?: unknown) => void) =>
      next();
  }

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq: ClientRequest, req: IncomingMessage) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
    },
  } as Parameters<typeof createProxyMiddleware>[0]) as RequestHandler;
}

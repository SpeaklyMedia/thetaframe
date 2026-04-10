import { getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    req.log.warn(
      {
        route: "require_auth",
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        authStatus: auth ? "resolved_without_user" : "missing",
      },
      "Unauthorized request: Clerk did not resolve a userId",
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  next();
};

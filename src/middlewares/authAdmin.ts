import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/request";
import { UserRole } from "../constants/enums";

export const authorizeAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (
    req.user.role !== UserRole.ADMIN &&
    req.user.role !== UserRole.SUPER_ADMIN
  ) {
    return res
      .status(403)
      .json({ message: "Access denied: Admins or Super Admins only" });
  }

  next();
};

export const checkRole = (
  roles: string[],
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

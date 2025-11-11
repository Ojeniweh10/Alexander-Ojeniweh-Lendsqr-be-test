import { Request, Response, NextFunction } from "express";
import { AuthRequest, AppError } from "../types";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError(401, "No token provided"));
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);

    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return next(
      error instanceof AppError
        ? error
        : new AppError(401, "Authentication failed")
    );
  }
};

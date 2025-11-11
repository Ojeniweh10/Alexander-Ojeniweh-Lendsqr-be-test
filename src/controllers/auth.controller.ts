import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { CreateUserDTO, LoginDTO } from "../types";
import { catchAsync } from "../utils/catchAsync"; // ✅ import helper

const authService = new AuthService();

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  const userData: CreateUserDTO = req.body;
  const result = await authService.register(userData);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: result.user,
      wallet: result.wallet,
      token: result.token,
    },
  });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  const loginData: LoginDTO = req.body;
  const result = await authService.login(loginData);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
      wallet: result.wallet,
      token: result.token,
    },
  });
});

import { Request, Response } from "express";
import { WalletService } from "../services/wallet.service";
import { AuthRequest, FundWalletDTO, TransferDTO, WithdrawDTO } from "@/types";
import { catchAsync } from "../utils/catchAsync";

const walletService = new WalletService();

export const getBalance = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.userId;
  const { balance, currency } = await walletService.getBalance(userId);
  res.json({ success: true, data: { balance, currency } });
});

export const fundWallet = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.userId;
  const fundData = req.body as FundWalletDTO;
  const result = await walletService.fundWallet(userId, fundData);
  res.json({ success: true, data: result });
});

export const transfer = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.userId;
  const transferData = req.body as TransferDTO;
  const result = await walletService.transfer(userId, transferData);
  res.json({ success: true, data: result });
});

export const withdraw = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.userId;
  const withdrawData = req.body as WithdrawDTO;
  const result = await walletService.withdraw(userId, withdrawData);
  res.json({ success: true, data: result });
});

export const getTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await walletService.getTransactionHistory(
      userId,
      page,
      limit
    );
    res.json({ success: true, data: result });
  }
);

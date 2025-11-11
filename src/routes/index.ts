import {
  registerUserSchema,
  loginSchema,
  fundWalletSchema,
  transferSchema,
  withdrawSchema,
} from "../utils/validatiors";
import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as walletController from "../controllers/wallet.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Demo-Credit Wallet Service is running" });
});
router.post(
  "/auth/register",
  validateRequest(registerUserSchema),
  authController.register
);
router.post("/auth/login", validateRequest(loginSchema), authController.login);
router.get("/wallet/balance", authenticate, walletController.getBalance);
router.post(
  "/wallet/fund",
  authenticate,
  validateRequest(fundWalletSchema),
  walletController.fundWallet
);
router.post(
  "/wallet/transfer",
  authenticate,
  validateRequest(transferSchema),
  walletController.transfer
);
router.post(
  "/wallet/withdraw",
  authenticate,
  validateRequest(withdrawSchema),
  walletController.withdraw
);
router.get(
  "/wallet/transactions",
  authenticate,
  walletController.getTransactions
);

export default router;

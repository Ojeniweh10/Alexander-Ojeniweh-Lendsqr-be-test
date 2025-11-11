import { WalletService } from "@/services/wallet.service";
import { WalletRepository } from "@/repositories/wallet.repository";
import { TransactionRepository } from "@/repositories/transaction.repository";
import { UserRepository } from "@/repositories/user.repository";
import {
  AppError,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
} from "@/types";
import { db } from "@/config/database";

jest.mock("@/repositories/wallet.repository");
jest.mock("@/repositories/transaction.repository");
jest.mock("@/repositories/user.repository");
jest.mock("@/config/database", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

describe("WalletService", () => {
  let walletService: WalletService;
  let mockWalletRepo: jest.Mocked<WalletRepository>;
  let mockTransactionRepo: jest.Mocked<TransactionRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockTrx: any;

  const userId = 1;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup transaction mock
    mockTrx = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    (db.transaction as jest.Mock).mockResolvedValue(mockTrx);

    // Create service instance
    walletService = new WalletService();

    // Get mocked instances
    mockWalletRepo = (walletService as any).walletRepo;
    mockTransactionRepo = (walletService as any).transactionRepo;
    mockUserRepo = (walletService as any).userRepo;
  });

  describe("getBalance", () => {
    it("should return wallet balance", async () => {
      const mockWallet = {
        id: 1,
        user_id: userId,
        balance: 5000,
        currency: "NGN",
        is_active: true,
      };

      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);

      const result = await walletService.getBalance(userId);

      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(result.balance).toBe(5000);
      expect(result.currency).toBe("NGN");
    });

    it("should throw error if wallet not found", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await expect(walletService.getBalance(userId)).rejects.toThrow(
        new AppError(404, "Wallet not found")
      );
    });
  });

  describe("fundWallet", () => {
    const mockWallet = {
      id: 1,
      user_id: userId,
      balance: 1000,
      currency: "NGN",
      is_active: true,
    };

    const fundData = {
      amount: 5000,
    };

    it("should fund wallet successfully", async () => {
      const mockTransaction = {
        id: 1,
        wallet_id: mockWallet.id,
        transaction_type: TransactionType.CREDIT,
        amount: fundData.amount,
        balance_before: 1000,
        balance_after: 6000,
        status: TransactionStatus.PENDING,
        reference: "TXN-WALLET-FUNDING-123",
      };

      const updatedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      };

      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValue(1000);
      mockTransactionRepo.create.mockResolvedValue(mockTransaction as any);
      mockWalletRepo.updateBalance.mockResolvedValue(undefined as any);
      mockTransactionRepo.updateStatus.mockResolvedValue(
        updatedTransaction as any
      );

      const result = await walletService.fundWallet(userId, fundData);

      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockWalletRepo.getBalanceWithLock).toHaveBeenCalledWith(
        mockWallet.id,
        mockTrx
      );
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_id: mockWallet.id,
          transaction_type: TransactionType.CREDIT,
          amount: fundData.amount,
          balance_before: 1000,
          balance_after: 6000,
          category: TransactionCategory.FUNDING,
        }),
        mockTrx
      );
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        mockWallet.id,
        6000,
        mockTrx
      );
      expect(mockTransactionRepo.updateStatus).toHaveBeenCalledWith(
        mockTransaction.id,
        TransactionStatus.SUCCESS,
        mockTrx
      );
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(result.newBalance).toBe(6000);
      expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
    });

    it("should throw error if wallet not found", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await expect(walletService.fundWallet(userId, fundData)).rejects.toThrow(
        new AppError(404, "Wallet not found")
      );
    });

    it("should throw error if wallet is inactive", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue({
        ...mockWallet,
        is_active: false,
      } as any);

      await expect(walletService.fundWallet(userId, fundData)).rejects.toThrow(
        new AppError(403, "Wallet is inactive")
      );
    });

    it("should rollback transaction on error", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValue(1000);
      mockTransactionRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(walletService.fundWallet(userId, fundData)).rejects.toThrow(
        new AppError(500, "Failed to fund wallet. Please try again.")
      );

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });

  describe("transfer", () => {
    const senderWallet = {
      id: 1,
      user_id: userId,
      balance: 10000,
      currency: "NGN",
      is_active: true,
    };

    const recipient = {
      id: 2,
      email: "recipient@ng.com",
      first_name: "Jane",
      last_name: "Smith",
      account_number: "0987654321",
      is_blacklisted: false,
      is_active: true,
    };

    const recipientWallet = {
      id: 2,
      user_id: recipient.id,
      balance: 5000,
      currency: "NGN",
      is_active: true,
    };

    const transferData = {
      recipient_account_number: "0987654321",
      amount: 2000,
      description: "Payment for services",
    };

    it("should transfer funds successfully", async () => {
      const mockDebitTxn = {
        id: 1,
        wallet_id: senderWallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: transferData.amount,
        balance_before: 10000,
        balance_after: 8000,
        status: TransactionStatus.PENDING,
        reference: "TXN-WALLET-DEBIT-123",
      };

      const mockCreditTxn = {
        id: 2,
        wallet_id: recipientWallet.id,
        transaction_type: TransactionType.CREDIT,
        amount: transferData.amount,
        balance_before: 5000,
        balance_after: 7000,
        status: TransactionStatus.PENDING,
        reference: "TXN-WALLET-CREDIT-123",
      };

      mockWalletRepo.findByUserId.mockResolvedValueOnce(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue(recipient as any);
      mockWalletRepo.findByUserId.mockResolvedValueOnce(recipientWallet as any);
      mockWalletRepo.getBalanceWithLock
        .mockResolvedValueOnce(10000) // sender balance
        .mockResolvedValueOnce(5000); // recipient balance
      mockTransactionRepo.create
        .mockResolvedValueOnce(mockDebitTxn as any)
        .mockResolvedValueOnce(mockCreditTxn as any);
      mockWalletRepo.updateBalance.mockResolvedValue(undefined as any);
      mockTransactionRepo.updateStatus.mockResolvedValue(undefined as any);
      mockTransactionRepo.findById.mockResolvedValue({
        ...mockDebitTxn,
        status: TransactionStatus.SUCCESS,
      } as any);

      const result = await walletService.transfer(userId, transferData);

      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockUserRepo.findByAccountNumber).toHaveBeenCalledWith(
        transferData.recipient_account_number
      );
      expect(mockWalletRepo.getBalanceWithLock).toHaveBeenCalledTimes(2);
      expect(mockTransactionRepo.create).toHaveBeenCalledTimes(2);
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        senderWallet.id,
        8000,
        mockTrx
      );
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        recipientWallet.id,
        7000,
        mockTrx
      );
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(result.newBalance).toBe(8000);
      expect(result.recipient.name).toBe("Jane Smith");
    });

    it("should throw error if sender wallet not found", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await expect(
        walletService.transfer(userId, transferData)
      ).rejects.toThrow(new AppError(404, "Your wallet not found"));
    });

    it("should throw error if recipient not found", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue(null);

      await expect(
        walletService.transfer(userId, transferData)
      ).rejects.toThrow(new AppError(404, "Recipient account not found"));
    });

    it("should throw error for self-transfer", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue({
        ...recipient,
        id: userId, // Same as sender
      } as any);

      await expect(
        walletService.transfer(userId, transferData)
      ).rejects.toThrow(
        new AppError(400, "Cannot transfer to your own account")
      );
    });

    it("should throw error if recipient is blacklisted", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue({
        ...recipient,
        is_blacklisted: true,
      } as any);

      await expect(
        walletService.transfer(userId, transferData)
      ).rejects.toThrow(
        new AppError(403, "Recipient account is not available")
      );
    });

    it("should throw error if sender has insufficient balance", async () => {
      mockWalletRepo.findByUserId.mockResolvedValueOnce(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue(recipient as any);
      mockWalletRepo.findByUserId.mockResolvedValueOnce(recipientWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValueOnce(1000); // Insufficient balance

      await expect(
        walletService.transfer(userId, { ...transferData, amount: 5000 })
      ).rejects.toThrow(new AppError(400, "Insufficient balance"));

      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      mockWalletRepo.findByUserId.mockResolvedValueOnce(senderWallet as any);
      mockUserRepo.findByAccountNumber.mockResolvedValue(recipient as any);
      mockWalletRepo.findByUserId.mockResolvedValueOnce(recipientWallet as any);
      mockWalletRepo.getBalanceWithLock
        .mockResolvedValueOnce(10000)
        .mockResolvedValueOnce(5000);
      mockTransactionRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(
        walletService.transfer(userId, transferData)
      ).rejects.toThrow(
        new AppError(500, "Failed to process transfer. Please try again.")
      );

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });

  describe("withdraw", () => {
    const mockWallet = {
      id: 1,
      user_id: userId,
      balance: 10000,
      currency: "NGN",
      is_active: true,
    };

    const withdrawData = {
      amount: 3000,
      description: "Cash withdrawal",
    };

    it("should withdraw funds successfully", async () => {
      const mockTransaction = {
        id: 1,
        wallet_id: mockWallet.id,
        transaction_type: TransactionType.DEBIT,
        amount: withdrawData.amount,
        balance_before: 10000,
        balance_after: 7000,
        status: TransactionStatus.PENDING,
        reference: "TXN-WALLET-WITHDRAWAL-123",
      };

      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValue(10000);
      mockTransactionRepo.create.mockResolvedValue(mockTransaction as any);
      mockWalletRepo.updateBalance.mockResolvedValue(undefined as any);
      mockTransactionRepo.updateStatus.mockResolvedValue(undefined as any);
      mockTransactionRepo.findById.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      } as any);

      const result = await walletService.withdraw(userId, withdrawData);

      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockWalletRepo.getBalanceWithLock).toHaveBeenCalledWith(
        mockWallet.id,
        mockTrx
      );
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_id: mockWallet.id,
          transaction_type: TransactionType.DEBIT,
          amount: withdrawData.amount,
          balance_before: 10000,
          balance_after: 7000,
          category: TransactionCategory.WITHDRAWAL,
        }),
        mockTrx
      );
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        mockWallet.id,
        7000,
        mockTrx
      );
      expect(mockTrx.commit).toHaveBeenCalled();
      expect(result.newBalance).toBe(7000);
    });

    it("should throw error if wallet not found", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(null);

      await expect(
        walletService.withdraw(userId, withdrawData)
      ).rejects.toThrow(new AppError(404, "Wallet not found"));
    });

    it("should throw error if wallet is inactive", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue({
        ...mockWallet,
        is_active: false,
      } as any);

      await expect(
        walletService.withdraw(userId, withdrawData)
      ).rejects.toThrow(new AppError(403, "Wallet is inactive"));
    });

    it("should throw error if insufficient balance", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValue(1000);

      await expect(
        walletService.withdraw(userId, { ...withdrawData, amount: 5000 })
      ).rejects.toThrow(new AppError(400, "Insufficient balance"));

      expect(mockTrx.rollback).toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockWallet as any);
      mockWalletRepo.getBalanceWithLock.mockResolvedValue(10000);
      mockTransactionRepo.create.mockRejectedValue(new Error("Database error"));

      await expect(
        walletService.withdraw(userId, withdrawData)
      ).rejects.toThrow(
        new AppError(500, "Failed to withdraw funds. Please try again.")
      );

      expect(mockTrx.rollback).toHaveBeenCalled();
      expect(mockTrx.commit).not.toHaveBeenCalled();
    });
  });

  describe("getTransactionHistory", () => {
    it("should return paginated transaction history", async () => {
      const mockTransactions = [
        {
          id: 1,
          wallet_id: 1,
          transaction_type: TransactionType.CREDIT,
          amount: 5000,
          status: TransactionStatus.SUCCESS,
        },
        {
          id: 2,
          wallet_id: 1,
          transaction_type: TransactionType.DEBIT,
          amount: 2000,
          status: TransactionStatus.SUCCESS,
        },
      ];

      mockTransactionRepo.getUserTransactions.mockResolvedValue({
        transactions: mockTransactions as any,
        total: 50,
      });

      const result = await walletService.getTransactionHistory(userId, 1, 20);

      expect(mockTransactionRepo.getUserTransactions).toHaveBeenCalledWith(
        userId,
        1,
        20
      );
      expect(result.transactions).toEqual(mockTransactions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });

    it("should use default pagination values", async () => {
      mockTransactionRepo.getUserTransactions.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await walletService.getTransactionHistory(userId);

      expect(mockTransactionRepo.getUserTransactions).toHaveBeenCalledWith(
        userId,
        1,
        20
      );
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });
});

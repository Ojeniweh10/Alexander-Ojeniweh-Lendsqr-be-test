import { db } from "../config/database";
import { WalletRepository } from "../repositories/wallet.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { UserRepository } from "../repositories/user.repository";
import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
  FundWalletDTO,
  TransferDTO,
  WithdrawDTO,
} from "../types";

import logger from "../utils/logger";

export class WalletService {
  private walletRepo: WalletRepository;
  private transactionRepo: TransactionRepository;
  private userRepo: UserRepository;

  constructor() {
    this.walletRepo = new WalletRepository();
    this.transactionRepo = new TransactionRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: number) {
    const wallet = await this.walletRepo.findByUserId(userId);

    if (!wallet) {
      throw new AppError(404, "Wallet not found");
    }

    return {
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
    };
  }

  /**
   * Fund wallet
   * In a real system, this would integrate with a payment gateway
   * For this MVP, we'll simulate successful funding
   */
  async fundWallet(userId: number, fundData: FundWalletDTO) {
    const wallet = await this.walletRepo.findByUserId(userId);

    if (!wallet) {
      throw new AppError(404, "Wallet not found");
    }

    if (!wallet.is_active) {
      throw new AppError(403, "Wallet is inactive");
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Lock wallet row and get current balance
      const currentBalance = await this.walletRepo.getBalanceWithLock(
        wallet.id,
        trx
      );

      const newBalance = currentBalance + fundData.amount;

      // Create transaction record
      const reference = `TXN-WALLET-FUNDING${Date.now()}-${uuidv4().slice(0, 8)}`;
      const transaction = await this.transactionRepo.create(
        {
          wallet_id: wallet.id,
          transaction_type: TransactionType.CREDIT,
          amount: fundData.amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: "Wallet funding",
          category: TransactionCategory.FUNDING,
          reference: reference,
        },
        trx
      );

      // Update wallet balance
      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);

      // Mark transaction as successful
      const finaltransaction = await this.transactionRepo.updateStatus(
        transaction.id,
        TransactionStatus.SUCCESS,
        trx
      );

      await trx.commit();

      logger.info("Wallet funded successfully", {
        userId,
        walletId: wallet.id,
        amount: fundData.amount,
        reference: transaction.reference,
      });

      return {
        transaction: finaltransaction,
        newBalance,
      };
    } catch (error) {
      await trx.rollback();
      logger.error("Error funding wallet", { userId, error });
      throw new AppError(500, "Failed to fund wallet. Please try again.");
    }
  }

  /**
   * Transfer funds to another user
   */
  async transfer(userId: number, transferData: TransferDTO) {
    // Get sender's wallet
    const senderWallet = await this.walletRepo.findByUserId(userId);

    if (!senderWallet) {
      throw new AppError(404, "Your wallet not found");
    }

    if (!senderWallet.is_active) {
      throw new AppError(403, "Your wallet is inactive");
    }

    // Find recipient by account number
    const recipient = await this.userRepo.findByAccountNumber(
      transferData.recipient_account_number
    );

    if (!recipient) {
      throw new AppError(404, "Recipient account not found");
    }

    // Prevent self-transfer
    if (recipient.id === userId) {
      throw new AppError(400, "Cannot transfer to your own account");
    }

    // Check if recipient is blacklisted or inactive
    if (recipient.is_blacklisted || !recipient.is_active) {
      throw new AppError(403, "Recipient account is not available");
    }

    // Get recipient's wallet
    const recipientWallet = await this.walletRepo.findByUserId(recipient.id);

    if (!recipientWallet || !recipientWallet.is_active) {
      throw new AppError(404, "Recipient wallet not available");
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Lock both wallets and get balances
      const senderBalance = await this.walletRepo.getBalanceWithLock(
        senderWallet.id,
        trx
      );

      // Check if sender has sufficient balance
      if (senderBalance < transferData.amount) {
        throw new AppError(400, "Insufficient balance");
      }

      const recipientBalance = await this.walletRepo.getBalanceWithLock(
        recipientWallet.id,
        trx
      );

      // Calculate new balances
      const senderNewBalance = senderBalance - transferData.amount;
      const recipientNewBalance = recipientBalance + transferData.amount;

      // Create debit transaction for sender
      let ref = `TXN-WALLET-DEBIT${Date.now()}-${uuidv4().slice(0, 8)}`;
      const debitTransaction = await this.transactionRepo.create(
        {
          wallet_id: senderWallet.id,
          transaction_type: TransactionType.DEBIT,
          amount: transferData.amount,
          balance_before: senderBalance,
          balance_after: senderNewBalance,
          description:
            transferData.description ||
            `Transfer to ${recipient.first_name} ${recipient.last_name}`,
          category: TransactionCategory.TRANSFER,
          related_wallet_id: recipientWallet.id,
          metadata: {
            recipient_name: `${recipient.first_name} ${recipient.last_name}`,
            recipient_account: recipient.account_number,
          },
          reference: ref,
        },
        trx
      );

      // Create credit transaction for recipient
      let reference = `TXN-WALLET-CREDIT${Date.now()}-${uuidv4().slice(0, 8)}`;
      const creditTransaction = await this.transactionRepo.create(
        {
          wallet_id: recipientWallet.id,
          transaction_type: TransactionType.CREDIT,
          amount: transferData.amount,
          balance_before: recipientBalance,
          balance_after: recipientNewBalance,
          description: `Transfer from ${recipient.first_name} ${recipient.last_name}`,
          category: TransactionCategory.TRANSFER,
          related_wallet_id: senderWallet.id,
          metadata: {
            sender_id: userId,
          },
          reference: reference,
        },
        trx
      );

      // Update both wallet balances
      await this.walletRepo.updateBalance(
        senderWallet.id,
        senderNewBalance,
        trx
      );
      await this.walletRepo.updateBalance(
        recipientWallet.id,
        recipientNewBalance,
        trx
      );

      // Mark both transactions as successful
      await this.transactionRepo.updateStatus(
        debitTransaction.id,
        TransactionStatus.SUCCESS,
        trx
      );
      await this.transactionRepo.updateStatus(
        creditTransaction.id,
        TransactionStatus.SUCCESS,
        trx
      );

      await trx.commit();

      logger.info("Transfer completed successfully", {
        senderId: userId,
        recipientId: recipient.id,
        amount: transferData.amount,
        reference: debitTransaction.reference,
      });

      return {
        transaction: await this.transactionRepo.findById(debitTransaction.id),
        newBalance: senderNewBalance,
        recipient: {
          name: `${recipient.first_name} ${recipient.last_name}`,
          account_number: recipient.account_number,
        },
      };
    } catch (error) {
      await trx.rollback();
      logger.error("Error processing transfer", { userId, error });

      // Re-throw AppErrors as-is
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, "Failed to process transfer. Please try again.");
    }
  }

  /**
   * Withdraw funds from wallet
   * In a real system, this would integrate with a payment gateway
   * For this MVP, we'll simulate successful withdrawal
   */
  async withdraw(userId: number, withdrawData: WithdrawDTO) {
    const wallet = await this.walletRepo.findByUserId(userId);

    if (!wallet) {
      throw new AppError(404, "Wallet not found");
    }

    if (!wallet.is_active) {
      throw new AppError(403, "Wallet is inactive");
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Lock wallet and get current balance
      const currentBalance = await this.walletRepo.getBalanceWithLock(
        wallet.id,
        trx
      );

      // Check sufficient balance
      if (currentBalance < withdrawData.amount) {
        throw new AppError(400, "Insufficient balance");
      }

      const newBalance = currentBalance - withdrawData.amount;

      // Create transaction record
      const reference = `TXN-WALLET-WITHDRAWAL${Date.now()}-${uuidv4().slice(0, 8)}`;
      const transaction = await this.transactionRepo.create(
        {
          wallet_id: wallet.id,
          transaction_type: TransactionType.DEBIT,
          amount: withdrawData.amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: withdrawData.description || "Wallet withdrawal",
          category: TransactionCategory.WITHDRAWAL,
          reference: reference,
        },
        trx
      );

      // Update wallet balance
      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);

      // Mark transaction as successful
      await this.transactionRepo.updateStatus(
        transaction.id,
        TransactionStatus.SUCCESS,
        trx
      );

      await trx.commit();

      logger.info("Withdrawal successful", {
        userId,
        walletId: wallet.id,
        amount: withdrawData.amount,
        reference: transaction.reference,
      });

      return {
        transaction: await this.transactionRepo.findById(transaction.id),
        newBalance,
      };
    } catch (error) {
      await trx.rollback();
      logger.error("Error processing withdrawal", { userId, error });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(500, "Failed to withdraw funds. Please try again.");
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const { transactions, total } =
      await this.transactionRepo.getUserTransactions(userId, page, limit);

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

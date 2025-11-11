import { db } from "../config/database";
import { Knex } from "knex";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  TransactionStatus,
  AppError,
} from "../types";

export class TransactionRepository {
  private readonly tableName = "transactions";

  /** Create a new transaction record */
  async create(
    data: {
      wallet_id: number;
      transaction_type: TransactionType;
      amount: number;
      balance_before: number;
      balance_after: number;
      description?: string;
      category: TransactionCategory;
      related_wallet_id?: number;
      metadata?: any;
      status?: TransactionStatus;
      reference: string;
    },
    trx?: Knex.Transaction
  ): Promise<Transaction> {
    const query = trx
      ? db(this.tableName).transacting(trx)
      : db(this.tableName);

    const [id] = await query.insert({
      ...data,
      status: data.status || "pending",
    });

    const transaction = await this.findById(id, trx);

    if (!transaction) {
      throw new AppError(500, "Failed to create transaction");
    }
    return transaction;
  }

  /** Find transaction by ID */
  async findById(
    id: number,
    trx?: Knex.Transaction
  ): Promise<Transaction | null> {
    // Consistent pattern: use trx if provided, otherwise use db
    const query = trx ? trx(this.tableName) : db(this.tableName);

    const row = await query.where({ id }).first();

    return row || null;
  }

  /** Find by reference (unique) */
  async findByReference(reference: string): Promise<Transaction | null> {
    const tx = await db(this.tableName).where({ reference }).first();
    return tx || null;
  }

  /** Update transaction status */
  async updateStatus(
    id: number,
    status: TransactionStatus,
    trx?: Knex.Transaction
  ): Promise<Transaction> {
    // Use the transaction or db consistently
    const query = trx ? trx(this.tableName) : db(this.tableName);

    const affected = await query.where({ id }).update({
      status,
      updated_at: db.fn.now(),
    });

    if (affected === 0) {
      throw new AppError(404, "Transaction not found for status update");
    }

    // Fetch using the SAME transaction context
    const transaction = await this.findById(id, trx);

    if (!transaction) {
      throw new AppError(404, "Transaction not found after update");
    }

    return transaction;
  }

  async getUserTransactions(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const wallet = await db("wallets").where({ user_id: userId }).first();
    const offset = (page - 1) * limit;

    const [totalResult] = await db(this.tableName)
      .where({ wallet_id: wallet.id })
      .count("* as total");
    const total = Number(totalResult.total);

    const transactions = await db(this.tableName)
      .where({ wallet_id: wallet.id })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);
    return { transactions, total };
  }

  /** Get paginated transactions for a wallet */
  async findByWalletId(
    walletId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const offset = (page - 1) * limit;

    const [totalResult] = await db(this.tableName)
      .where({ wallet_id: walletId })
      .count("* as total");

    const total = Number(totalResult.total);
    const totalPages = Math.ceil(total / limit);

    const data = await db(this.tableName)
      .where({ wallet_id: walletId })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: { page, limit, total, totalPages },
    };
  }
}

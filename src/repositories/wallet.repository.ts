import { db } from "../config/database";
import { Wallet, Transaction, AppError } from "../types";
import { Knex } from "knex";

export class WalletRepository {
  private readonly tableName = "wallets";

  /** Create a new wallet for a user */
  async create(userId: number, trx?: Knex.Transaction): Promise<Wallet> {
    const query = trx
      ? db(this.tableName).transacting(trx)
      : db(this.tableName);
    const [id] = await query.insert({
      user_id: userId,
      balance: 0,
      currency: "ngn",
      is_active: true,
    });
    const wallet = await this.findById(id, trx);
    if (!wallet) throw new AppError(500, "Failed to create wallet");
    return wallet;
  }

  async findById(id: number, trx?: any): Promise<Wallet | null> {
    const query = trx
      ? db(this.tableName).transacting(trx)
      : db(this.tableName);
    return query.where("id", id).first();
  }

  async findByUserId(userId: number): Promise<Wallet | null> {
    const wallet = await db(this.tableName).where({ user_id: userId }).first();
    return wallet || null;
  }

  async getBalanceWithLock(walletId: number, trx: any): Promise<number> {
    const result = await db(this.tableName)
      .transacting(trx)
      .forUpdate()
      .select("balance")
      .where({ id: walletId })
      .first();
    return parseFloat(result.balance.toString());
  }

  async updateBalance(
    walletId: number,
    newBalance: number,
    trx?: any
  ): Promise<Wallet> {
    const query = db(this.tableName).where({ id: walletId });

    await (trx ? query.transacting(trx) : query).update({
      balance: newBalance,
      updated_at: db.fn.now(),
    });
    const wallet = await this.findById(walletId);
    if (!wallet) throw new AppError(404, "wallet not found after update");
    return wallet;
  }

  async findByIdWithUser(
    id: number
  ): Promise<(Wallet & { email: string }) | null> {
    const result = await db(this.tableName)
      .join("users", "wallets.user_id", "users.id")
      .select("wallets.*", "users.email")
      .where("wallets.id", id)
      .first();

    return result || null;
  }
}

import { db } from "./../config/database";
import { User, AppError } from "../types";
import { error } from "console";

export class UserRepository {
  private readonly tableName = "users";

  /**
   * Create a new user
   */
  async create(userData: Partial<User>, trx?: any): Promise<User> {
    const query = trx
      ? db(this.tableName).transacting(trx)
      : db(this.tableName);

    const insertData = {
      ...userData,
      dob: userData.dob
        ? new Date(userData.dob).toISOString().split("T")[0]
        : null,
    };
    console.log("insert data:", insertData);
    const [id] = await query.insert(insertData);
    const userId = Number(id);

    const user = await this.findById(userId, trx);
    if (!user) throw new AppError(500, "Failed to create user");

    return user;
  }

  /**
   * Find user by ID
   */
  async findById(id: number, trx?: any): Promise<User | null> {
    const query = trx
      ? db(this.tableName).transacting(trx)
      : db(this.tableName);
    return query.where("id", id).first();
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await db(this.tableName).where({ email }).first();
    return user || null;
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const user = await db(this.tableName)
      .where({ phone_number: phoneNumber })
      .first();
    return user || null;
  }

  /**
   * Find user by account number
   */
  async findByAccountNumber(accountNumber: string): Promise<User | null> {
    const user = await db(this.tableName)
      .where({ account_number: accountNumber })
      .first();
    return user || null;
  }

  /**
   * Update user
   */
  async update(id: number, userData: Partial<User>): Promise<User> {
    await db(this.tableName)
      .where({ id })
      .update({
        ...userData,
        updated_at: db.fn.now(),
      });
    const user = await this.findById(id);
    if (!user) throw new AppError(404, "User not found after update");
    return user;
  }

  /**
   * Check if email, number, acct number exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await db(this.tableName)
      .where({ email })
      .count<{ cnt: number }>("id as cnt")
      .first();

    return (count?.cnt ?? 0) > 0;
  }

  async phoneNumberExists(phoneNumber: string): Promise<boolean> {
    const count = await db(this.tableName)
      .where({ phone_number: phoneNumber })
      .count<{ cnt: number }>("id as cnt")
      .first();

    return (count?.cnt ?? 0) > 0;
  }

  async accountNumberExists(accountNumber: string): Promise<boolean> {
    const count = await db(this.tableName)
      .where({ account_number: accountNumber })
      .count<{ cnt: number }>("id as cnt")
      .first();

    return (count?.cnt ?? 0) > 0;
  }
}

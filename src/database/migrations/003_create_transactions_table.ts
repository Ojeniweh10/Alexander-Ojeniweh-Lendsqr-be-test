import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("transactions", (table) => {
    table.bigIncrements("id").primary();
    table.string("reference", 50).notNullable().unique();
    table.bigInteger("wallet_id").unsigned().notNullable();
    table.bigInteger("related_wallet_id").unsigned().nullable();
    table.decimal("amount", 15, 2).notNullable();
    table.decimal("balance_before", 15, 2).notNullable();
    table.decimal("balance_after", 15, 2).notNullable();
    table.string("description", 255).nullable();
    table.json("metadata").nullable();
    table.enu("transaction_type", ["credit", "debit"]).notNullable();
    table.enu("category", ["funding", "transfer", "withdrawal"]).notNullable();
    table
      .enu("status", ["pending", "success", "failed"])
      .notNullable()
      .defaultTo("pending");
    table.timestamps(true, true);

    table
      .foreign("wallet_id")
      .references("id")
      .inTable("wallets")
      .onDelete("RESTRICT");
    table
      .foreign("related_wallet_id")
      .references("id")
      .inTable("wallets")
      .onDelete("SET NULL");

    table.index("reference", "idx_transactions_reference");
    table.index("wallet_id", "idx_transactions_wallet");
    table.index("created_at", "idx_transactions_date");
    table.index("status", "idx_transactions_status");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("transactions");
}

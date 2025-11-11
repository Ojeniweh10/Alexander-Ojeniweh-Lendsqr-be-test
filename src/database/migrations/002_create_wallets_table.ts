import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("wallets", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("user_id").unsigned().notNullable().unique();
    table.decimal("balance", 15, 2).notNullable().defaultTo(0.0);
    table.string("currency", 3).notNullable().defaultTo("ngn");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamps(true, true);

    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.index("user_id", "idx_wallets_user_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("wallets");
}

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('phone_number', 20).notNullable().unique();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('bvn', 11).notNullable();
    table.string('bvn_phone_number', 20).notNullable();
    table.date('dob').notNullable();
    table.text('address').notNullable();
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('account_number', 10).notNullable();
    table.string('bank_code', 10).notNullable();
    table.boolean('is_blacklisted').defaultTo(false);
    table.text('blacklist_reason').nullable();
    table.integer('adjutor_customer_id').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index('email', 'idx_users_email');
    table.index('phone_number', 'idx_users_phone');
    table.index('account_number', 'idx_users_account');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}
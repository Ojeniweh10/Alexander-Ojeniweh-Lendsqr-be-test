import { config } from "./enviroment";
import knex from "knex";

export const db = knex({
  client: "mysql2",
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "./migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./seeds",
    extension: "ts",
  },
  debug: config.nodeEnv === "development",
});

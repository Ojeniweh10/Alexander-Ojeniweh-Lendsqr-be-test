import dotenv from "dotenv";
dotenv.config();

export const config = {
  app: {
    name: process.env.APP_NAME || "demo-credit-wallet-service",
    env: process.env.NODE_ENV || "development",
  },

  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "demo-credit_wallet",
    ssl: process.env.DB_SSL === "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiry: process.env.JWT_EXPIRES_IN || "24h",
  },

  adjutor: {
    apiUrl: process.env.ADJUTOR_API_URL!,
    apiKey: process.env.ADJUTOR_API_KEY!,
  },

  slack: {
    token: process.env.SLACK_TOKEN!,
    channels: {
      errors: process.env.SLACK_CHANNEL_ERRORS || "#demo-credit-errors",
      warnings: process.env.SLACK_CHANNEL_WARNINGS || "#demo-credit-warnings",
      info: process.env.SLACK_CHANNEL_INFO || "#demo-credit-info",
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

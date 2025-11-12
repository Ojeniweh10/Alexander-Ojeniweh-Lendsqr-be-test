import { config } from "./config/enviroment";
import { db } from "./config/database";
import app from "./app";
import logger from "./utils/logger";

const PORT = config.port || 3000;

// Debug: Log all env vars at startup
console.log("=== ENV DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("=================");

const startServer = async () => {
  try {
    await db.raw("SELECT 1");
    logger.info("Database connected successfully");

    app.listen(PORT, () => {
      logger.info(`Demo-Credit Wallet Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
      logger.info(`API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

startServer();

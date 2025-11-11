import { config } from "./config/enviroment";
import { db } from "./config/database";
import app from "./app";
import logger from "./utils/logger";

const PORT = config.port || 3000;

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

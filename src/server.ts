import { config } from "./config/enviroment";
import { db } from "./config/database";
import app from "./app";
import logger from "./utils/logger";

const PORT = config.port || 3000;

const startServer = async () => {
  try {
    try {
      await db.raw("SELECT 1");
      console.log("Database connected successfully");
    } catch (error) {
      console.error("DB connection failed:", error);
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`Demo-Credit Wallet Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

startServer();

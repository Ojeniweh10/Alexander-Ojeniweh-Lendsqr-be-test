import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import routes from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import { AppError } from "./types";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use("/api", routes);

app.use("*", (req, res, next) => {
  throw new AppError(404, "Route not found");
});

app.use(errorHandler);

export default app;

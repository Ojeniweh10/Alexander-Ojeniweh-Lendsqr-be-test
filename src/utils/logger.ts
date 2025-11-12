import fs from "fs";
import path from "path";
import { config } from "./../config/enviroment";
import winston from "winston";
import { WebClient } from "@slack/web-api";

const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

let slackClient: WebClient | null = null;
if (config.slack?.token) {
  slackClient = new WebClient(config.slack.token);
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  })
);

class SlackTransport extends winston.transports.Stream {
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit("logged", info));
    const { level, message, ...meta } = info;
    const channel = this.getChannel(level);
    const color = this.getColor(level);

    if (!slackClient || !channel) {
      callback();
      return;
    }

    slackClient.chat
      .postMessage({
        channel,
        text: `*${level.toUpperCase()}* in \`${config.app.name}\``,
        attachments: [
          {
            color,
            title: message,
            fields: Object.keys(meta).length
              ? [{ title: "Details", value: JSON.stringify(meta, null, 2) }]
              : [],
            footer: config.app.name,
            ts: String(Math.floor(Date.now() / 1000)),
          },
        ],
      })
      .catch(() => {})
      .finally(callback);
  }

  private getChannel(level: string): string | null {
    const map: Record<string, string> = {
      error: config.slack.channels.errors,
      warn: config.slack.channels.warnings,
      info: config.slack.channels.info,
    };
    return map[level] || null;
  }

  private getColor(level: string): string {
    return (
      { error: "#dc3545", warn: "#ffc107", info: "#17a2b8" }[level] || "#6c757d"
    );
  }
}

const logger = winston.createLogger({
  level: config.logging.level || "info",
  format: logFormat,
  defaultMeta: { service: config.app.name },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
});

if (config.nodeEnv !== "production") {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

// if (
//   config.nodeEnv === "production" &&
//   slackClient &&
//   config.slack.channels.errors
// ) {
//   logger.add(new SlackTransport());
// }

export default logger;

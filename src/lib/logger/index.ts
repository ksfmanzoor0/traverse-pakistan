import pino from "pino";
import type { AuditAction } from "./types";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  customLevels: { audit: 35 },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        singleLine: false,
        timestampKey: "timestamp",
      },
    },
  }),
});

export function logAudit(
  action: keyof AuditAction,
  data: {
    requestId: string;
    userId?: string;
    bookingRef?: string;
    ip?: string;
    amount?: number;
    details?: Record<string, unknown>;
    error?: Error;
  }
): void {
  const { error, ...rest } = data;
  logger.info({
    level: "audit",
    actionType: action,
    timestamp: new Date().toISOString(),
    ...rest,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as NodeJS.ErrnoException).code,
      },
    }),
  });
}

export function logError(
  message: string,
  error: Error | unknown,
  requestId: string,
  context?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({
    message,
    requestId,
    errorMessage: err.message,
    errorStack: err.stack,
    errorCode: (err as NodeJS.ErrnoException).code,
    ...(context && { context }),
  });
}

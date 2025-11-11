import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import logger from '../utils/logger';



export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    logger.warn('AppError', {
      status: error.statusCode,
      message: error.message,
      path: req.path,
      method: req.method,
    });

    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
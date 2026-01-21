import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors from express-validator
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Request validation errors',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : undefined,
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined,
        location: error.type === 'field' ? (error as any).location : undefined
      })),
      timestamp: new Date().toISOString()
    });
  }

  next();
};
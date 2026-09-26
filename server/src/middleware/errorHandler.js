import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function notFoundHandler(req, res, next) {
  next(
    new AppError(`Route not found: ${req.method} ${req.originalUrl}`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 404,
    })
  );
}

export function errorHandler(err, req, res, next) {
  void next;
  let statusCode = err.statusCode || 500;
  let code = err.code || ErrorCodes.INTERNAL_ERROR;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || [];

  if (err.name === 'ZodError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
  }

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    code = ErrorCodes.CONFLICT;
    message = 'Duplicate value';
    const fields = Object.keys(err.keyPattern || {});
    errors = fields.map((field) => ({ field, message: `${field} already exists` }));
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Invalid identifier';
  }

  if (!err.isOperational) {
    logger.error('unhandled.error', {
      message: err.message,
      stack: config.env === 'development' ? err.stack : undefined,
      path: req.originalUrl,
    });
    if (config.env !== 'development') {
      message = 'Internal server error';
      code = ErrorCodes.INTERNAL_ERROR;
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors,
  });
}

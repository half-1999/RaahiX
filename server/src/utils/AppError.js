export class AppError extends Error {
  constructor(message, { code = 'INTERNAL_ERROR', statusCode = 500, errors = [] } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

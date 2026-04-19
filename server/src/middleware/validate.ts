/**
 * Request validation middleware factory.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register)
 *
 * On validation failure, returns a 422 with structured field errors.
 * On success, replaces req.body with the Zod-parsed (type-safe) value.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodError(result.error);
      _res.status(422).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          fields: errors,
        },
      });
      return;
    }

    // Replace body with parsed (trimmed, coerced) values
    req.body = result.data as typeof req.body;
    next();
  };
}

function formatZodError(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

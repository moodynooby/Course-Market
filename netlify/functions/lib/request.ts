import { ZodError, type ZodType } from 'zod';
import { formatZodError } from '../../../db/validation';
import { jsonResponse } from './response';

export function parseJsonBody<T>(
  body: string | null,
  schema: ZodType<T>,
): { data: T } | { error: ReturnType<typeof jsonResponse> } {
  try {
    return { data: schema.parse(body ? JSON.parse(body) : {}) };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: jsonResponse(400, formatZodError(error)) };
    }
    return { error: jsonResponse(400, { error: 'Invalid JSON' }) };
  }
}

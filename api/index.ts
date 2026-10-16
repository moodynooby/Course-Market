import { createVercelHandler } from './_adapter';

export default createVercelHandler(async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'ok', message: 'AuraIsHub API is running' }),
}));

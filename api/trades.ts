import { handler } from '../netlify/functions/trades';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

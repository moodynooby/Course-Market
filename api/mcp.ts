import { handler } from '../netlify/functions/mcp';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

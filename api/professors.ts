import { handler } from '../netlify/functions/professors';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

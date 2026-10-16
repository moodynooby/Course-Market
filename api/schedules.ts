import { handler } from '../netlify/functions/schedules';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

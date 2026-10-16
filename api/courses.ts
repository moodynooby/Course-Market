import { handler } from '../netlify/functions/courses';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

import { handler } from '../netlify/functions/semesters';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

import { handler } from '../netlify/functions/user-profile';
import { createVercelHandler } from './_adapter';

export default createVercelHandler(handler);

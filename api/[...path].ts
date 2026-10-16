import { handler as coursesHandler } from '../netlify/functions/courses';
import { handler as professorsHandler } from '../netlify/functions/professors';
import { handler as schedulesHandler } from '../netlify/functions/schedules';
import { handler as semestersHandler } from '../netlify/functions/semesters';
import { handler as tradesHandler } from '../netlify/functions/trades';
import { handler as userProfileHandler } from '../netlify/functions/user-profile';
import { createVercelHandler, type ServerlessHandler } from './_adapter';

export const routeHandlers: Record<string, ServerlessHandler> = {
  trades: tradesHandler,
  professors: professorsHandler,
  semesters: semestersHandler,
  'user-profile': userProfileHandler,
  schedules: schedulesHandler,
  courses: coursesHandler,
};

export const catchAllHandler: ServerlessHandler = async (event) => {
  const pathParts = event.path.split('/').filter(Boolean);
  const apiIndex = pathParts.indexOf('api');
  const routeKey = apiIndex >= 0 ? pathParts[apiIndex + 1] : pathParts[0];

  const handler = routeKey ? routeHandlers[routeKey] : undefined;
  if (!handler) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Endpoint not found', path: event.path }),
    };
  }

  return handler(event);
};

export default createVercelHandler(catchAllHandler);

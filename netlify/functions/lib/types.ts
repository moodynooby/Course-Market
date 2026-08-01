// Minimal shape of the classic Netlify Functions event object we actually use.
// Avoids depending on `@netlify/functions` while still typing handlers.
export interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  path: string;
  body: string | null;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export const cacheHeaders: Record<string, string> = {
  'Cache-Control': 'public, max-age=3600',
  'CDN-Cache-Control': 'public, max-age=3600',
  'Netlify-CDN-Cache-Control': 'public, max-age=3600',
};

export function jsonResponse(
  statusCode: number,
  body: object,
  extraHeaders?: Record<string, string>,
) {
  return {
    statusCode,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function corsResponse() {
  return { statusCode: 200, headers: corsHeaders, body: '' };
}

export function secureErrorResponse(statusCode: number, message: string, error?: unknown) {
  // Always log the actual error for internal tracking
  if (error) {
    console.error(`[Status ${statusCode}] Internal error:`, error);
  }

  // If it's a 500 error, mask the message to prevent information disclosure
  const safeMessage = statusCode >= 500 ? 'Internal Server Error' : message;

  return jsonResponse(statusCode, {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request failed',
    message: safeMessage,
  });
}

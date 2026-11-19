import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { NetlifyEvent } from '../netlify/functions/lib/types';
import { createCoursesMcpServer } from './create-server';
import type { CourseDataSource } from './types';

export interface McpHttpHandlerResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const mcpCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept, mcp-session-id, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
  'Access-Control-Max-Age': '86400',
};

function buildWebRequest(event: NetlifyEvent): Request {
  const host = event.headers.host || 'localhost';
  const protocol = event.headers['x-forwarded-proto'] || 'https';
  const url = new URL(event.path || '/api/mcp', `${protocol}://${host}`);

  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value !== undefined) {
      headers.set(key, value);
    }
  }

  // Stateless JSON-only Streamable HTTP accepts standard MCP clients as well as clients
  // that omit text/event-stream from Accept while explicitly sending application/json.
  const accept = headers.get('accept');
  if (!accept || accept.trim() === '*/*') {
    headers.set('accept', 'application/json, text/event-stream');
  } else if (accept.includes('application/json') && !accept.includes('text/event-stream')) {
    headers.set('accept', `${accept}, text/event-stream`);
  }

  const hasBody = event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD' && event.body !== null;

  return new Request(url.toString(), {
    method: event.httpMethod,
    headers,
    body: hasBody ? event.body : undefined,
  });
}

export function createMcpHttpHandler(dataSourceFactory: () => CourseDataSource) {
  return async (event: NetlifyEvent): Promise<McpHttpHandlerResult> => {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: mcpCorsHeaders,
        body: '',
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          ...mcpCorsHeaders,
          Allow: 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed. This stateless MCP endpoint accepts POST requests only.',
          },
          id: null,
        }),
      };
    }

    const server = createCoursesMcpServer(dataSourceFactory());
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await server.connect(transport);
      const request = buildWebRequest(event);
      const response = await transport.handleRequest(request);
      const responseBody = await response.text();

      const responseHeaders: Record<string, string> = { ...mcpCorsHeaders };
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
      };
    } catch (error) {
      console.error('Unhandled MCP error:', error);
      return {
        statusCode: 500,
        headers: {
          ...mcpCorsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        }),
      };
    } finally {
      await Promise.allSettled([transport.close(), server.close()]);
    }
  };
}

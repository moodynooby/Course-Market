import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NetlifyEvent } from '../netlify/functions/lib/types';

export interface HandlerResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type ServerlessHandler = (event: NetlifyEvent) => Promise<HandlerResult>;

export function createVercelHandler(handler: ServerlessHandler) {
  return async (
    req: IncomingMessage & { query?: Record<string, string | string[]>; body?: unknown },
    res: ServerResponse,
  ) => {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);

    const queryParams: Record<string, string> = {};
    parsedUrl.searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
    if (req.query) {
      for (const [k, v] of Object.entries(req.query)) {
        if (typeof v === 'string') queryParams[k] = v;
        else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
          queryParams[k] = v[0];
        }
      }
    }

    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k.toLowerCase()] = v;
      else if (Array.isArray(v)) headers[k.toLowerCase()] = v.join(', ');
    }

    let bodyStr: string | null = null;
    if (req.body !== undefined && req.body !== null) {
      bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } else if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      if (chunks.length > 0) {
        bodyStr = Buffer.concat(chunks).toString('utf8');
      }
    }

    const event: NetlifyEvent = {
      httpMethod: req.method || 'GET',
      path: parsedUrl.pathname,
      headers,
      queryStringParameters: queryParams,
      body: bodyStr,
    };

    const result = await handler(event);

    res.statusCode = result.statusCode;
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }
    res.end(result.body);
  };
}

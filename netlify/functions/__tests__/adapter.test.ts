import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createVercelHandler } from '../../../api/_adapter';
import { catchAllHandler } from '../../../api/[...path]';

class MockIncomingMessage extends EventEmitter {
  method = 'GET';
  url = '/api/schedules/generate';
  headers: Record<string, string> = { host: 'localhost:3000' };
  query?: Record<string, string>;
  body?: unknown;

  async *[Symbol.asyncIterator]() {}
}

class MockServerResponse {
  statusCode = 200;
  headers: Record<string, string> = {};
  body = '';

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }

  end(data?: string) {
    if (data) this.body = data;
    return this;
  }
}

describe('Vercel adapter and routing', () => {
  it('converts Node.js request to NetlifyEvent and returns response', async () => {
    const mockHandler = async () => ({
      statusCode: 200,
      headers: { 'X-Custom-Header': 'AuraIsHub' },
      body: JSON.stringify({ success: true }),
    });

    const vercelFn = createVercelHandler(mockHandler);
    const req = new MockIncomingMessage() as unknown as IncomingMessage;
    const res = new MockServerResponse() as unknown as ServerResponse;

    await vercelFn(req, res);

    expect(res.statusCode).toBe(200);
    expect((res as unknown as MockServerResponse).headers['X-Custom-Header']).toBe('AuraIsHub');
    expect(JSON.parse((res as unknown as MockServerResponse).body)).toEqual({ success: true });
  });

  it('routes known paths in catchAllHandler', async () => {
    const event = {
      path: '/api/unknown-endpoint',
      httpMethod: 'GET',
      headers: {},
      body: null,
    };

    const result = await catchAllHandler(event);
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Endpoint not found');
  });
});

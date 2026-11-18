import { describe, expect, it } from 'vitest';
import { routeHandlers } from '../../../api/[...path]';
import { createMockCourseDataSource } from '../../../mcp/__tests__/mock-data-source';
import { createMcpHttpHandler } from '../../../mcp/http-handler';
import type { NetlifyEvent } from '../lib/types';

function makeEvent(overrides: Partial<NetlifyEvent> = {}): NetlifyEvent {
  return {
    path: '/api/mcp',
    httpMethod: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    queryStringParameters: undefined,
    body: null,
    ...overrides,
  };
}

describe('MCP Streamable HTTP serverless handler', () => {
  const handler = createMcpHttpHandler(() => createMockCourseDataSource());

  it('registers the mcp route in Vercel catch-all routeHandlers', () => {
    expect(typeof routeHandlers.mcp).toBe('function');
  });

  it('responds to OPTIONS preflight with MCP CORS headers', async () => {
    const res = await handler(makeEvent({ httpMethod: 'OPTIONS' }));
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('mcp-protocol-version');
  });

  it('rejects GET and DELETE with 405 Method Not Allowed', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await handler(makeEvent({ httpMethod: method }));
      expect(res.statusCode).toBe(405);
      expect(res.headers.Allow).toBe('POST, OPTIONS');
      expect(JSON.parse(res.body).error.code).toBe(-32000);
    }
  });

  it('completes initialize, tools/call, resources/read, and prompts/get over stateless POST', async () => {
    const initRes = await handler(
      makeEvent({
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'vitest-client', version: '1.0.0' },
          },
        }),
      }),
    );
    expect(initRes.statusCode).toBe(200);
    const initJson = JSON.parse(initRes.body);
    expect(initJson.result.serverInfo.name).toBe('aurais-courses');

    const callRes = await handler(
      makeEvent({
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'list_semesters',
            arguments: {},
          },
        }),
      }),
    );
    expect(callRes.statusCode).toBe(200);
    const callJson = JSON.parse(callRes.body);
    const parsedContent = JSON.parse(callJson.result.content[0].text);
    expect(parsedContent.defaultSemesterId).toBe('Winter2027');

    const resourceRes = await handler(
      makeEvent({
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'resources/read',
          params: { uri: 'courses://semesters/Winter2027/course/CS%20101' },
        }),
      }),
    );
    expect(resourceRes.statusCode).toBe(200);
    const resourceJson = JSON.parse(resourceRes.body);
    const courseDoc = JSON.parse(resourceJson.result.contents[0].text);
    expect(courseDoc.course.code).toBe('CS 101');

    const promptRes = await handler(
      makeEvent({
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'prompts/get',
          params: {
            name: 'plan-semester-schedule',
            arguments: { courses: 'CS 101, MATH 201' },
          },
        }),
      }),
    );
    expect(promptRes.statusCode).toBe(200);
    const promptJson = JSON.parse(promptRes.body);
    expect(promptJson.result.messages[0].content.text).toContain('CS 101, MATH 201');
  });

  it('accepts clients that send Accept: application/json without text/event-stream', async () => {
    const res = await handler(
      makeEvent({
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/list',
        }),
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).result.tools.length).toBeGreaterThan(0);
  });
});

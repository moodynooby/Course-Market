import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COURSES_MCP_PROMPTS, COURSES_MCP_RESOURCES, COURSES_MCP_TOOLS } from '../create-server';
import { createMcpHttpHandler } from '../http-handler';
import { createMockCourseDataSource } from './mock-data-source';

const FORBIDDEN_DOMAIN_PATTERN =
  /trade|trading|professor|rating|rmp|user_profile|userProfile|auth0/i;

async function postJsonRpc(
  handler: ReturnType<typeof createMcpHttpHandler>,
  payload: Record<string, unknown>,
) {
  const res = await handler({
    httpMethod: 'POST',
    path: '/api/mcp',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(payload),
  });
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
}

describe('courses-only MCP isolation boundary', () => {
  it('declares zero trading, Rate My Professor, or user-profile capabilities', () => {
    for (const tool of COURSES_MCP_TOOLS) {
      expect(tool).not.toMatch(FORBIDDEN_DOMAIN_PATTERN);
    }
    for (const resource of COURSES_MCP_RESOURCES) {
      expect(resource).not.toMatch(FORBIDDEN_DOMAIN_PATTERN);
    }
    for (const prompt of COURSES_MCP_PROMPTS) {
      expect(prompt).not.toMatch(FORBIDDEN_DOMAIN_PATTERN);
    }
  });

  it('exposes only the courses-only tools, resources, and prompts over JSON-RPC', async () => {
    const handler = createMcpHttpHandler(() => createMockCourseDataSource());

    const toolsRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });
    expect(toolsRes.statusCode).toBe(200);
    const toolNames = toolsRes.body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(toolNames).toEqual([...COURSES_MCP_TOOLS].sort());

    const promptsRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 2,
      method: 'prompts/list',
    });
    expect(promptsRes.statusCode).toBe(200);
    const promptNames = promptsRes.body.result.prompts.map((p: { name: string }) => p.name).sort();
    expect(promptNames).toEqual([...COURSES_MCP_PROMPTS].sort());

    const resourcesRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
    });
    expect(resourcesRes.statusCode).toBe(200);
    const uris = resourcesRes.body.result.resources.map((r: { uri: string }) => r.uri);
    expect(uris).toEqual(['courses://semesters']);
  });

  it('keeps DbCourseDataSource strictly isolated from excluded database tables', () => {
    const dbSource = readFileSync(resolve(process.cwd(), 'mcp/data-source-db.ts'), 'utf8');
    expect(dbSource).not.toMatch(FORBIDDEN_DOMAIN_PATTERN);
  });
});

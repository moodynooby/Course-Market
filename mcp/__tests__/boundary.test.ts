import { describe, expect, it } from 'vitest';
import { createMcpHttpHandler } from '../http-handler';
import { createMockCourseDataSource } from './mock-data-source';

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
  it('exposes only the courses-only capabilities over JSON-RPC', async () => {
    const handler = createMcpHttpHandler(() => createMockCourseDataSource());

    const toolsRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });
    expect(toolsRes.statusCode).toBe(200);
    const toolNames = toolsRes.body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(toolNames).toEqual([
      'check_section_conflicts',
      'export_schedule_ics',
      'generate_schedules',
      'get_course_details',
      'list_semesters',
      'list_subjects',
      'search_courses',
    ]);

    const promptsRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 2,
      method: 'prompts/list',
    });
    expect(promptsRes.statusCode).toBe(200);
    const promptNames = promptsRes.body.result.prompts.map((p: { name: string }) => p.name).sort();
    expect(promptNames).toEqual(['find-electives', 'plan-semester-schedule']);

    const resourcesRes = await postJsonRpc(handler, {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
    });
    expect(resourcesRes.statusCode).toBe(200);
    const uris = resourcesRes.body.result.resources.map((r: { uri: string }) => r.uri);
    expect(uris).toEqual(['courses://semesters']);
  });
});

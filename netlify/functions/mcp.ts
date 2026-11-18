import { DbCourseDataSource } from '../../mcp/data-source-db';
import { createMcpHttpHandler } from '../../mcp/http-handler';

const dataSource = new DbCourseDataSource();

export const handler = createMcpHttpHandler(() => dataSource);

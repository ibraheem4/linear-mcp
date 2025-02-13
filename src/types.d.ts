declare module "@modelcontextprotocol/sdk" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    tool<T>(
      name: string,
      description: string,
      schema: Record<string, any>,
      handler: (params: T) => Promise<{
        content: Array<{ type: string; text: string }>;
      }>
    ): void;
    connect(transport: any): Promise<void>;
  }
  export class StdioServerTransport {}
  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
  export const ErrorCode: { MethodNotFound: string };
  export class McpError extends Error {
    constructor(code: string, message: string);
  }
}

// Tool parameter types
interface CreateIssueParams {
  title: string;
  description?: string;
  teamId: string;
  assigneeId?: string;
  priority?: number;
  labels?: string[];
}

interface ListIssuesParams {
  teamId?: string;
  assigneeId?: string;
  status?: string;
  first?: number;
}

interface UpdateIssueParams {
  issueId: string;
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  priority?: number;
}

interface ListProjectsParams {
  teamId?: string;
  first?: number;
}

interface SearchIssuesParams {
  query: string;
  first?: number;
}

interface GetIssueParams {
  issueId: string;
}

#!/usr/bin/env node

import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";

// Type definitions for Linear params
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

// Load .env file from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  throw new Error(
    "LINEAR_API_KEY environment variable is required. Please create a .env file with LINEAR_API_KEY=your-api-key"
  );
}

const linearClient = new LinearClient({
  apiKey: API_KEY,
});

// Helper function for formatting issue data
async function formatIssue(issue: any) {
  const state = await issue.state;
  const assignee = await issue.assignee;
  return {
    id: issue.id,
    title: issue.title,
    status: state ? await state.name : "Unknown",
    assignee: assignee ? assignee.name : "Unassigned",
    priority: issue.priority,
    url: issue.url,
  };
}

const server = new Server(
  {
    name: "linear-mcp",
    version: "37.0.0", // Match Linear SDK version
  },
  {
    capabilities: {
      tools: {
        create_issue: {
          description: "Create a new issue in Linear",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              teamId: { type: "string" },
              assigneeId: { type: "string" },
              priority: { type: "number" },
              labels: { type: "array", items: { type: "string" } },
            },
            required: ["title", "teamId"],
          },
        },
        list_issues: {
          description: "List issues with optional filters",
          inputSchema: {
            type: "object",
            properties: {
              teamId: { type: "string" },
              assigneeId: { type: "string" },
              status: { type: "string" },
              first: { type: "number" },
            },
          },
        },
        update_issue: {
          description: "Update an existing issue",
          inputSchema: {
            type: "object",
            properties: {
              issueId: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              status: { type: "string" },
              assigneeId: { type: "string" },
              priority: { type: "number" },
            },
            required: ["issueId"],
          },
        },
        list_teams: {
          description: "List all teams in the workspace",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        list_projects: {
          description: "List all projects",
          inputSchema: {
            type: "object",
            properties: {
              teamId: { type: "string" },
              first: { type: "number" },
            },
          },
        },
        search_issues: {
          description: "Search for issues using a text query",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              first: { type: "number" },
            },
            required: ["query"],
          },
        },
        get_issue: {
          description: "Get details of a specific issue",
          inputSchema: {
            type: "object",
            properties: {
              issueId: { type: "string" },
            },
            required: ["issueId"],
          },
        },
      },
    },
  }
);

// Register request handlers
server.setRequestHandler(
  CallToolRequestSchema,
  async (request): Promise<ServerResult> => {
    const toolName = request.params.name;
    const params = request.params.arguments as any;

    switch (toolName) {
      case "create_issue": {
        const { title, description, teamId, assigneeId, priority, labels } =
          params as CreateIssueParams;
        const issue = await linearClient.createIssue({
          title,
          description,
          teamId,
          assigneeId,
          priority,
          labelIds: labels,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(issue, null, 2) }],
        };
      }

      case "list_issues": {
        const { teamId, assigneeId, status, first } =
          params as ListIssuesParams;
        const filter: Record<string, any> = {};
        if (teamId) filter.team = { id: { eq: teamId } };
        if (assigneeId) filter.assignee = { id: { eq: assigneeId } };
        if (status) filter.state = { name: { eq: status } };

        const issues = await linearClient.issues({
          first: first || 50,
          filter,
        });

        const formattedIssues = await Promise.all(
          (issues?.nodes || []).map(formatIssue)
        );

        return {
          content: [
            { type: "text", text: JSON.stringify(formattedIssues, null, 2) },
          ],
        };
      }

      case "update_issue": {
        const { issueId, title, description, status, assigneeId, priority } =
          params as UpdateIssueParams;
        const issue = await linearClient.issue(issueId);
        if (!issue) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Issue ${issueId} not found`
          );
        }

        const updatedIssue = await issue.update({
          title,
          description,
          stateId: status,
          assigneeId,
          priority,
        });

        return {
          content: [
            { type: "text", text: JSON.stringify(updatedIssue, null, 2) },
          ],
        };
      }

      case "list_teams": {
        const query = await linearClient.teams();
        const teams = await Promise.all(
          (query?.nodes || []).map(async (team: any) => ({
            id: team.id,
            name: team.name,
            key: team.key,
            description: team.description,
          }))
        );

        return {
          content: [{ type: "text", text: JSON.stringify(teams, null, 2) }],
        };
      }

      case "list_projects": {
        const { teamId, first } = params as ListProjectsParams;
        const filter: Record<string, any> = {};
        if (teamId) filter.team = { id: { eq: teamId } };

        const query = await linearClient.projects({
          first: first || 50,
          filter,
        });

        const projects = await Promise.all(
          (query?.nodes || []).map(async (project: any) => {
            const teamsConnection = await project.teams;
            const teams = teamsConnection
              ? (teamsConnection as any)?.nodes || []
              : [];
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              state: project.state,
              teamIds: teams.map((team: any) => team.id),
            };
          })
        );

        return {
          content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
        };
      }

      case "search_issues": {
        const { query, first } = params as SearchIssuesParams;
        if (!query) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Search query is required"
          );
        }

        const searchResults = await linearClient.searchIssues(query, {
          first: first || 50,
        });

        const formattedResults = await Promise.all(
          searchResults.nodes.map(async (result) => {
            const state = await result.state;
            const assignee = await result.assignee;
            return {
              id: result.id,
              title: result.title,
              status: state ? await state.name : "Unknown",
              assignee: assignee ? assignee.name : "Unassigned",
              priority: result.priority,
              url: result.url,
              metadata: result.metadata,
            };
          })
        );

        return {
          content: [
            { type: "text", text: JSON.stringify(formattedResults, null, 2) },
          ],
        };
      }

      case "get_issue": {
        const { issueId } = params as GetIssueParams;
        if (!issueId) {
          throw new McpError(ErrorCode.InvalidRequest, "Issue ID is required");
        }

        const issue = await linearClient.issue(issueId);
        if (!issue) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Issue ${issueId} not found`
          );
        }

        try {
          const [
            state,
            assignee,
            creator,
            team,
            project,
            parent,
            cycle,
            labels,
            comments,
            attachments,
          ] = await Promise.all([
            issue.state,
            issue.assignee,
            issue.creator,
            issue.team,
            issue.project,
            issue.parent,
            issue.cycle,
            issue.labels(),
            issue.comments(),
            issue.attachments(),
          ]);

          const issueDetails = {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            priority: issue.priority,
            priorityLabel: issue.priorityLabel,
            status: state ? await state.name : "Unknown",
            url: issue.url,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            startedAt: issue.startedAt || null,
            completedAt: issue.completedAt || null,
            canceledAt: issue.canceledAt || null,
            dueDate: issue.dueDate,
            assignee: assignee
              ? {
                  id: assignee.id,
                  name: assignee.name,
                  email: assignee.email,
                }
              : null,
            creator: creator
              ? {
                  id: creator.id,
                  name: creator.name,
                  email: creator.email,
                }
              : null,
            team: team
              ? {
                  id: team.id,
                  name: team.name,
                  key: team.key,
                }
              : null,
            project: project
              ? {
                  id: project.id,
                  name: project.name,
                  state: project.state,
                }
              : null,
            parent: parent
              ? {
                  id: parent.id,
                  title: parent.title,
                  identifier: parent.identifier,
                }
              : null,
            cycle:
              cycle && cycle.name
                ? {
                    id: cycle.id,
                    name: cycle.name,
                    number: cycle.number,
                  }
                : null,
            labels: await Promise.all(
              labels.nodes.map(async (label) => ({
                id: label.id,
                name: label.name,
                color: label.color,
              }))
            ),
            comments: await Promise.all(
              comments.nodes.map(async (comment) => ({
                id: comment.id,
                body: comment.body,
                createdAt: comment.createdAt,
              }))
            ),
            attachments: await Promise.all(
              attachments.nodes.map(async (attachment) => ({
                id: attachment.id,
                title: attachment.title,
                url: attachment.url,
              }))
            ),
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(issueDetails, null, 2),
              },
            ],
          };
        } catch (error: any) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to process issue details: ${error.message}`
          );
        }
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`
        );
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

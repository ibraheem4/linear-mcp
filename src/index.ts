#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { LinearClient } from "@linear/sdk";
import { GitHubClient } from "./github.js";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!LINEAR_API_KEY) {
  throw new Error("LINEAR_API_KEY environment variable is required");
}

if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN environment variable is required");
}

const linearClient = new LinearClient({
  apiKey: LINEAR_API_KEY,
});

const githubClient = new GitHubClient(GITHUB_TOKEN);

const server = new Server(
  {
    name: "linear-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "github_create_branch",
      description: "Create a new branch in a GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          branch: {
            type: "string",
            description: "New branch name",
          },
          fromBranch: {
            type: "string",
            description: "Base branch to create from (default: dev)",
          },
        },
        required: ["owner", "repo", "branch"],
      },
    },
    {
      name: "github_update_pr",
      description: "Update an existing pull request in a GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
          title: {
            type: "string",
            description: "New pull request title",
          },
          body: {
            type: "string",
            description: "New pull request description",
          },
        },
        required: ["owner", "repo", "pullNumber"],
      },
    },
    {
      name: "github_create_pr",
      description: "Create a pull request in a GitHub repository",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          title: {
            type: "string",
            description: "Pull request title",
          },
          body: {
            type: "string",
            description: "Pull request description",
          },
          head: {
            type: "string",
            description: "Head branch",
          },
          base: {
            type: "string",
            description: "Base branch (default: dev)",
          },
        },
        required: ["owner", "repo", "title", "head"],
      },
    },
    {
      name: "github_get_pr",
      description: "Get details of a GitHub pull request",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
        },
        required: ["owner", "repo", "pullNumber"],
      },
    },
    {
      name: "github_link_pr_to_linear",
      description: "Link a GitHub pull request to a Linear issue",
      inputSchema: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "Repository owner",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          pullNumber: {
            type: "number",
            description: "Pull request number",
          },
          issueId: {
            type: "string",
            description: "Linear issue ID",
          },
        },
        required: ["owner", "repo", "pullNumber", "issueId"],
      },
    },
    {
      name: "get_issue",
      description: "Get details of a specific issue including images",
      inputSchema: {
        type: "object",
        properties: {
          issueId: {
            type: "string",
            description: "Issue ID",
          },
        },
        required: ["issueId"],
      },
    },
    {
      name: "create_issue",
      description: "Create a new issue in Linear",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Issue title",
          },
          description: {
            type: "string",
            description: "Issue description (markdown supported)",
          },
          teamId: {
            type: "string",
            description: "Team ID",
          },
          assigneeId: {
            type: "string",
            description: "Assignee user ID (optional)",
          },
          priority: {
            type: "number",
            description: "Priority (0-4, optional)",
            minimum: 0,
            maximum: 4,
          },
          labels: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Label IDs to apply (optional)",
          },
        },
        required: ["title", "teamId"],
      },
    },
    {
      name: "list_issues",
      description: "List issues with optional filters",
      inputSchema: {
        type: "object",
        properties: {
          teamId: {
            type: "string",
            description: "Filter by team ID (optional)",
          },
          assigneeId: {
            type: "string",
            description: "Filter by assignee ID (optional)",
          },
          status: {
            type: "string",
            description: "Filter by status (optional)",
          },
          first: {
            type: "number",
            description: "Number of issues to return (default: 50)",
          },
        },
      },
    },
    {
      name: "update_issue",
      description: "Update an existing issue",
      inputSchema: {
        type: "object",
        properties: {
          issueId: {
            type: "string",
            description: "Issue ID",
          },
          title: {
            type: "string",
            description: "New title (optional)",
          },
          description: {
            type: "string",
            description: "New description (optional)",
          },
          status: {
            type: "string",
            description: "New status (optional)",
          },
          assigneeId: {
            type: "string",
            description: "New assignee ID (optional)",
          },
          priority: {
            type: "number",
            description: "New priority (0-4, optional)",
            minimum: 0,
            maximum: 4,
          },
        },
        required: ["issueId"],
      },
    },
    {
      name: "list_teams",
      description: "List all teams in the workspace",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "list_projects",
      description: "List all projects",
      inputSchema: {
        type: "object",
        properties: {
          teamId: {
            type: "string",
            description: "Filter by team ID (optional)",
          },
          first: {
            type: "number",
            description: "Number of projects to return (default: 50)",
          },
        },
      },
    },
    {
      name: "search_issues",
      description: "Search for issues using a text query",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query text",
          },
          first: {
            type: "number",
            description: "Number of results to return (default: 50)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "create_feature_pr",
      description: "Create a feature PR for a Linear issue",
      inputSchema: {
        type: "object",
        properties: {
          issueId: {
            type: "string",
            description: "Linear Issue ID (e.g. ARC-114)",
          },
          owner: {
            type: "string",
            description: "GitHub repository owner",
          },
          repo: {
            type: "string",
            description: "GitHub repository name",
          },
          base: {
            type: "string",
            description: "Base branch to create PR against",
            default: "dev",
          },
        },
        required: ["issueId", "owner", "repo"],
      },
    },
  ],
}));

type CreateIssueArgs = {
  title: string;
  description?: string;
  teamId: string;
  assigneeId?: string;
  priority?: number;
  labels?: string[];
};

type ListIssuesArgs = {
  teamId?: string;
  assigneeId?: string;
  status?: string;
  first?: number;
};

type UpdateIssueArgs = {
  issueId: string;
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  priority?: number;
};

type ListProjectsArgs = {
  teamId?: string;
  first?: number;
};

type SearchIssuesArgs = {
  query: string;
  first?: number;
};

type CreateFeaturePrArgs = {
  issueId: string;
  owner: string;
  repo: string;
  base?: string;
};

type GetIssueArgs = {
  issueId: string;
};

import axios from "axios";

async function analyzeImage(url: string): Promise<string> {
  try {
    // Fetch the image data
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    // Convert image data to base64
    const imageBase64 = Buffer.from(response.data).toString("base64");

    // Return the base64 data for Claude to analyze
    // Claude will receive this data and use its vision capabilities
    // to analyze the image directly
    return `Base64 image data: ${imageBase64}`;
  } catch (error: unknown) {
    console.error("Error fetching image:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return [
      "Image Analysis Error:",
      "- Unable to fetch image content",
      "- Error occurred during fetch",
      `- Error details: ${errorMessage}`,
    ].join("\n");
  }
}

async function extractAndAnalyzeImages(
  text: string
): Promise<Array<{ url: string; analysis: string }>> {
  const imageMatches = text?.match(/!\[.*?\]\((.*?)\)/g) || [];
  return Promise.all(
    imageMatches.map(async (match) => {
      const url = match.match(/\((.*?)\)/)?.[1] || "";
      const analysis = await analyzeImage(url);
      return { url, analysis };
    })
  );
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "create_issue": {
        const args = request.params.arguments as unknown as CreateIssueArgs;
        if (!args?.title || !args?.teamId) {
          throw new Error("Title and teamId are required");
        }

        const issue = await linearClient.createIssue({
          title: args.title,
          description: args.description,
          teamId: args.teamId,
          assigneeId: args.assigneeId,
          priority: args.priority,
          labelIds: args.labels,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case "list_issues": {
        const args = request.params.arguments as unknown as ListIssuesArgs;
        const filter: Record<string, any> = {};
        if (args?.teamId) filter.team = { id: { eq: args.teamId } };
        if (args?.assigneeId) filter.assignee = { id: { eq: args.assigneeId } };
        if (args?.status) filter.state = { name: { eq: args.status } };

        const issues = await linearClient.issues({
          first: args?.first ?? 50,
          filter,
        });

        const formattedIssues = await Promise.all(
          (issues?.nodes || []).map(async (issue) => {
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
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formattedIssues, null, 2),
            },
          ],
        };
      }

      case "update_issue": {
        const args = request.params.arguments as unknown as UpdateIssueArgs;
        if (!args?.issueId) {
          throw new Error("Issue ID is required");
        }

        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          throw new Error(`Issue ${args.issueId} not found`);
        }

        const updatedIssue = await issue.update({
          title: args.title,
          description: args.description,
          stateId: args.status,
          assigneeId: args.assigneeId,
          priority: args.priority,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedIssue, null, 2),
            },
          ],
        };
      }

      case "list_teams": {
        const query = await linearClient.teams();
        const teams = await Promise.all(
          ((query as any)?.nodes || []).map(async (team: any) => ({
            id: team.id,
            name: team.name,
            key: team.key,
            description: team.description,
          }))
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(teams, null, 2),
            },
          ],
        };
      }

      case "search_issues": {
        const args = request.params.arguments as unknown as SearchIssuesArgs;
        if (!args?.query) {
          throw new Error("Search query is required");
        }

        const searchResults = await linearClient.searchIssues(args.query, {
          first: args?.first ?? 50,
        });

        const formattedResults = await Promise.all(
          (searchResults?.nodes || []).map(async (result) => {
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
            {
              type: "text",
              text: JSON.stringify(formattedResults, null, 2),
            },
          ],
        };
      }

      case "github_create_branch": {
        const args = request.params.arguments as {
          owner: string;
          repo: string;
          branch: string;
          fromBranch?: string;
        };
        const result = await githubClient.createBranch(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "github_update_pr": {
        const args = request.params.arguments as {
          owner: string;
          repo: string;
          pullNumber: number;
          title?: string;
          body?: string;
        };

        // Extract and analyze any images in the updated PR body
        const analyzedImages = args.body
          ? await extractAndAnalyzeImages(args.body)
          : [];

        const result = await githubClient.updatePullRequest(args);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...result,
                  analyzedImages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "github_create_pr": {
        const args = request.params.arguments as {
          owner: string;
          repo: string;
          title: string;
          body: string;
          head: string;
          base: string;
        };

        // Extract and analyze any images in the PR body
        const analyzedImages = await extractAndAnalyzeImages(args.body);

        const result = await githubClient.createPullRequest(args);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...result,
                  analyzedImages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "github_get_pr": {
        const args = request.params.arguments as {
          owner: string;
          repo: string;
          pullNumber: number;
        };
        const result = await githubClient.getPullRequest(args);

        // Extract and analyze any images in the PR body
        const analyzedImages = await extractAndAnalyzeImages(result.body);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...result,
                  analyzedImages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "github_link_pr_to_linear": {
        const args = request.params.arguments as {
          owner: string;
          repo: string;
          pullNumber: number;
          issueId: string;
        };
        const result = await githubClient.linkPullRequestToLinear(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "create_feature_pr": {
        const args = request.params.arguments as unknown as CreateFeaturePrArgs;
        if (!args?.issueId || !args?.owner || !args?.repo) {
          throw new Error("issueId, owner, and repo are required");
        }

        // Get Linear issue details
        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          throw new Error(`Issue ${args.issueId} not found`);
        }

        const branchName = issue.branchName;
        if (!branchName) {
          throw new Error(`Branch name not found for issue ${args.issueId}`);
        }

        // Create branch
        await githubClient.createBranch({
          owner: args.owner,
          repo: args.repo,
          branch: branchName,
          fromBranch: args.base || "dev",
        });

        // Analyze any images in the issue description
        const analyzedImages = await extractAndAnalyzeImages(
          issue.description || ""
        );

        // Create PR with analyzed images
        const pr = await githubClient.createPullRequest({
          owner: args.owner,
          repo: args.repo,
          title: `[${args.issueId}] ${issue.title}`,
          body: `Fixes ${issue.url}\n\n${issue.description || ""}`,
          head: branchName,
          base: args.base || "dev",
        });

        // Link PR to Linear issue
        await githubClient.linkPullRequestToLinear({
          owner: args.owner,
          repo: args.repo,
          pullNumber: pr.number,
          issueId: args.issueId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...pr,
                  analyzedImages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_issue": {
        const args = request.params.arguments as unknown as GetIssueArgs;
        if (!args?.issueId) {
          throw new Error("Issue ID is required");
        }

        const issue = await linearClient.issue(args.issueId);
        if (!issue) {
          throw new Error(`Issue ${args.issueId} not found`);
        }

        // Fetch all related data in parallel
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

          // Dates
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          startedAt: issue.startedAt,
          completedAt: issue.completedAt,
          canceledAt: issue.canceledAt,
          dueDate: issue.dueDate,

          // Related entities
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
          cycle: cycle
            ? {
                id: cycle.id,
                name: cycle.name,
                number: cycle.number,
              }
            : null,

          // Collections
          labels: await Promise.all(
            (labels?.nodes || []).map(async (label) => ({
              id: label.id,
              name: label.name,
              color: label.color,
            }))
          ),
          comments: await Promise.all(
            (comments?.nodes || []).map(async (comment) => ({
              id: comment.id,
              body: comment.body,
              createdAt: comment.createdAt,
            }))
          ),

          // Extract and analyze embedded images from description
          embeddedImages: await Promise.all(
            (issue.description?.match(/!\[.*?\]\((.*?)\)/g) || []).map(
              async (match) => {
                const url = match.match(/\((.*?)\)/)?.[1] || "";
                const analysis = await analyzeImage(url);
                return {
                  url,
                  analysis,
                };
              }
            )
          ),

          // Get and analyze attachments
          attachments: await Promise.all(
            (attachments?.nodes || [])
              .filter((attachment: any) =>
                attachment?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              )
              .map(async (attachment: any) => {
                const analysis = await analyzeImage(attachment.url);
                return {
                  id: attachment.id,
                  title: attachment.title,
                  url: attachment.url,
                  source: attachment.source,
                  metadata: attachment.metadata,
                  analysis,
                };
              })
          ),

          // Additional metadata
          estimate: issue.estimate,
          customerTicketCount: issue.customerTicketCount,
          previousIdentifiers: issue.previousIdentifiers,
          branchName: issue.branchName,
          archivedAt: issue.archivedAt,
          autoArchivedAt: issue.autoArchivedAt,
          autoClosedAt: issue.autoClosedAt,
          trashed: issue.trashed,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issueDetails, null, 2),
            },
          ],
        };
      }

      case "list_projects": {
        const args = request.params.arguments as unknown as ListProjectsArgs;
        const filter: Record<string, any> = {};
        if (args?.teamId) filter.team = { id: { eq: args.teamId } };

        const query = await linearClient.projects({
          first: args?.first ?? 50,
          filter,
        });

        const projects = await Promise.all(
          ((query as any)?.nodes || []).map(async (project: any) => {
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
          content: [
            {
              type: "text",
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  } catch (error: any) {
    console.error("Linear API Error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Linear API error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linear MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

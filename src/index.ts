#!/usr/bin/env node

import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/sdk";
import { LinearClient } from "@linear/sdk";
import { z } from "zod";

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

const server = new McpServer({
  name: "linear-mcp",
  version: "37.0.0", // Match Linear SDK version
});

// Register Linear tools with Zod schemas
server.tool<CreateIssueParams>(
  "create_issue",
  "Create a new issue in Linear",
  {
    title: z.string().describe("Issue title"),
    description: z
      .string()
      .optional()
      .describe("Issue description (markdown supported)"),
    teamId: z.string().describe("Team ID"),
    assigneeId: z.string().optional().describe("Assignee user ID"),
    priority: z.number().min(0).max(4).optional().describe("Priority (0-4)"),
    labels: z.array(z.string()).optional().describe("Label IDs to apply"),
  },
  async ({ title, description, teamId, assigneeId, priority, labels }) => {
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
);

server.tool<ListIssuesParams>(
  "list_issues",
  "List issues with optional filters",
  {
    teamId: z.string().optional().describe("Filter by team ID"),
    assigneeId: z.string().optional().describe("Filter by assignee ID"),
    status: z.string().optional().describe("Filter by status"),
    first: z
      .number()
      .optional()
      .default(50)
      .describe("Number of issues to return"),
  },
  async ({ teamId, assigneeId, status, first }) => {
    const filter: Record<string, any> = {};
    if (teamId) filter.team = { id: { eq: teamId } };
    if (assigneeId) filter.assignee = { id: { eq: assigneeId } };
    if (status) filter.state = { name: { eq: status } };

    const issues = await linearClient.issues({
      first,
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
);

server.tool<UpdateIssueParams>(
  "update_issue",
  "Update an existing issue",
  {
    issueId: z.string().describe("Issue ID"),
    title: z.string().optional().describe("New title (optional)"),
    description: z.string().optional().describe("New description (optional)"),
    status: z.string().optional().describe("New status (optional)"),
    assigneeId: z.string().optional().describe("New assignee ID (optional)"),
    priority: z
      .number()
      .min(0)
      .max(4)
      .optional()
      .describe("New priority (0-4, optional)"),
  },
  async ({ issueId, title, description, status, assigneeId, priority }) => {
    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const updatedIssue = await issue.update({
      title,
      description,
      stateId: status,
      assigneeId,
      priority,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(updatedIssue, null, 2) }],
    };
  }
);

server.tool("list_teams", "List all teams in the workspace", {}, async () => {
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
    content: [{ type: "text", text: JSON.stringify(teams, null, 2) }],
  };
});

server.tool<ListProjectsParams>(
  "list_projects",
  "List all projects",
  {
    teamId: z.string().optional().describe("Filter by team ID (optional)"),
    first: z
      .number()
      .optional()
      .default(50)
      .describe("Number of projects to return"),
  },
  async ({ teamId, first }) => {
    const filter: Record<string, any> = {};
    if (teamId) filter.team = { id: { eq: teamId } };

    const query = await linearClient.projects({
      first,
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
      content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
    };
  }
);

server.tool<SearchIssuesParams>(
  "search_issues",
  "Search for issues using a text query",
  {
    query: z.string().describe("Search query text"),
    first: z
      .number()
      .optional()
      .default(50)
      .describe("Number of results to return"),
  },
  async ({ query, first }) => {
    if (!query) {
      throw new Error("Search query is required");
    }

    const searchResults = await linearClient.searchIssues(query, {
      first,
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
);

server.tool<GetIssueParams>(
  "get_issue",
  "Get details of a specific issue",
  {
    issueId: z.string().describe("Issue ID"),
  },
  async ({ issueId }) => {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issue = await linearClient.issue(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    try {
      // Get basic issue details
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

      const issueDetails: {
        id: string;
        identifier: string;
        title: string;
        description: string | undefined;
        priority: number;
        priorityLabel: string;
        status: string;
        url: string;
        createdAt: Date;
        updatedAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        canceledAt: Date | null;
        dueDate: string | null;
        assignee: { id: string; name: string; email: string } | null;
        creator: { id: string; name: string; email: string } | null;
        team: { id: string; name: string; key: string } | null;
        project: { id: string; name: string; state: string } | null;
        parent: { id: string; title: string; identifier: string } | null;
        cycle: { id: string; name: string; number: number } | null;
        labels: Array<{ id: string; name: string; color: string }>;
        comments: Array<{ id: string; body: string; createdAt: Date }>;
        attachments: Array<{ id: string; title: string; url: string }>;
        embeddedImages: Array<{ url: string; analysis: string }>;
        estimate: number | null;
        customerTicketCount: number;
        previousIdentifiers: string[];
        branchName: string;
        archivedAt: Date | null;
        autoArchivedAt: Date | null;
        autoClosedAt: Date | null;
        trashed: boolean;
      } = {
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
        embeddedImages: [],
        estimate: issue.estimate || null,
        customerTicketCount: issue.customerTicketCount || 0,
        previousIdentifiers: issue.previousIdentifiers || [],
        branchName: issue.branchName || "",
        archivedAt: issue.archivedAt || null,
        autoArchivedAt: issue.autoArchivedAt || null,
        autoClosedAt: issue.autoClosedAt || null,
        trashed: issue.trashed || false,
      };

      // Extract embedded images from description
      const imageMatches = issue.description?.match(/!\[.*?\]\((.*?)\)/g) || [];
      if (imageMatches.length > 0) {
        issueDetails.embeddedImages = imageMatches.map((match) => {
          const url = match.match(/\((.*?)\)/)?.[1] || "";
          return {
            url,
            analysis: "Image analysis would go here", // Replace with actual image analysis if available
          };
        });
      }

      // Add image analysis for attachments if they are images
      issueDetails.attachments = await Promise.all(
        attachments.nodes
          .filter((attachment) =>
            attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          )
          .map(async (attachment) => ({
            id: attachment.id,
            title: attachment.title,
            url: attachment.url,
            analysis: "Image analysis would go here", // Replace with actual image analysis if available
          }))
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(issueDetails, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error processing issue details:", error);
      throw new Error(`Failed to process issue details: ${error.message}`);
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

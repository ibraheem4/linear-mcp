# Linear MCP Server

> Note: This is a custom implementation. For the Cline Linear MCP server, see [cline/linear-mcp](https://github.com/cline/linear-mcp) or [Linear's Blog Post about MCP](https://linear.app/changelog/2025-05-01-mcp).

<a href="https://glama.ai/mcp/servers/71fqw0uqmx"> <img width="380" height="200" src="https://glama.ai/mcp/servers/71fqw0uqmx/badge" />

A Model Context Protocol (MCP) server that provides tools for interacting with Linear's API, enabling AI agents to manage issues, projects, and teams programmatically through the Linear platform.

## Features

- **Issue Management**

  - Create new issues with customizable properties (title, description, team, assignee, priority, labels)
  - List issues with flexible filtering options (team, assignee, status)
  - Update existing issues (title, description, status, assignee, priority)

- **Team Management**

  - List all teams in the workspace
  - Access team details including ID, name, key, and description

- **Project Management**
  - List all projects with optional team filtering
  - View project details including name, description, state, and associated teams

## Prerequisites

- Node.js (v16 or higher)
- A Linear account with API access
- Linear API key with appropriate permissions

## Quick Start

1. Get your Linear API key from [Linear's Developer Settings](https://linear.app/settings/api)

2. Run with your API key:

```bash
LINEAR_API_KEY=your-api-key npx @ibraheem4/linear-mcp
```

Or set it in your environment:

```bash
export LINEAR_API_KEY=your-api-key
npx @ibraheem4/linear-mcp
```

## Development Setup

1. Clone the repository:

```bash
git clone [repository-url]
cd linear-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Running with Inspector

For local development and debugging, you can use the MCP Inspector:

1. Install supergateway:

```bash
npm install -g supergateway
```

2. Use the included `run.sh` script:

```bash
chmod +x run.sh
LINEAR_API_KEY=your-api-key ./run.sh
```

3. Access the Inspector:
   - Open [localhost:1337](http://localhost:1337) in your browser
   - The Inspector connects via Server-Sent Events (SSE)
   - Test and debug tool calls through the Inspector interface

## Configuration

Configure the MCP server in your settings file based on your client:

### For Claude Desktop

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linear-mcp": {
      "command": "node",
      "args": ["/path/to/linear-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For VS Code Extension (Cline)

Location: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "linear-mcp": {
      "command": "node",
      "args": ["/path/to/linear-mcp/build/index.js"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For Cursor ([cursor.sh](https://cursor.sh))

For Cursor, the server must be run with the full path:

```bash
node /Users/ibraheem/Projects/linear-mcp/build/index.js
```

## Available Tools

### create_issue

Creates a new issue in Linear.

```typescript
{
  title: string;          // Required: Issue title
  description?: string;   // Optional: Issue description (markdown supported)
  teamId: string;        // Required: Team ID
  assigneeId?: string;   // Optional: Assignee user ID
  priority?: number;     // Optional: Priority (0-4)
  labels?: string[];     // Optional: Label IDs to apply
}
```

### list_issues

Lists issues with optional filters.

```typescript
{
  teamId?: string;      // Optional: Filter by team ID
  assigneeId?: string;  // Optional: Filter by assignee ID
  status?: string;      // Optional: Filter by status
  first?: number;       // Optional: Number of issues to return (default: 50)
}
```

### update_issue

Updates an existing issue.

```typescript
{
  issueId: string;       // Required: Issue ID
  title?: string;        // Optional: New title
  description?: string;  // Optional: New description
  status?: string;      // Optional: New status
  assigneeId?: string;  // Optional: New assignee ID
  priority?: number;    // Optional: New priority (0-4)
  labels?: string[];   // Optional: Label IDs to apply to the issue
}
```

### list_teams

Lists all teams in the workspace. No parameters required.

### list_projects

Lists all projects with optional filtering.

```typescript
{
  teamId?: string;     // Optional: Filter by team ID
  first?: number;      // Optional: Number of projects to return (default: 50)
}
```

### get_issue

Gets detailed information about a specific issue.

```typescript
{
  issueId: string; // Required: Issue ID
}
```

## Development

For development with auto-rebuild:

```bash
npm run watch
```

## Error Handling

The server includes comprehensive error handling for:

- Invalid API keys
- Missing required parameters
- Linear API errors
- Invalid tool requests

All errors are properly formatted and returned with descriptive messages.

## Technical Details

Built with:

- TypeScript
- Linear SDK (@linear/sdk v37.0.0)
- MCP SDK (@modelcontextprotocol/sdk v0.6.0)

The server uses stdio for communication and implements the Model Context Protocol for seamless integration with AI agents.

## License

MIT

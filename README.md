# Linear MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Linear's API, enabling AI agents to manage issues, projects, and teams programmatically through the Linear platform.

<a href="https://glama.ai/mcp/servers/71fqw0uqmx"><img width="380" height="200" src="https://glama.ai/mcp/servers/71fqw0uqmx/badge" alt="Linear Server MCP server" /></a>

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

- Node.js (v18 or higher)
- A Linear account with API access
- Linear API key with appropriate permissions

## Installation & Configuration

1. Copy .env.example to .env and add your Linear API key:
```bash
cp .env.example .env
```

Then edit .env to add your Linear API key:
```
LINEAR_API_KEY=your-api-key-here
```

2. Run the server using npx:
```bash
npx @ibraheem4/linear-mcp
```

The server will automatically read the LINEAR_API_KEY from your .env file.

## MCP Client Configuration

### For Cline (VS Code Extension)
Location: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@ibraheem4/linear-mcp"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For Roo Cline
Location: `~/Library/Application Support/Roo Cline/settings/cline_mcp_settings.json`
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@ibraheem4/linear-mcp"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For Claude Desktop
- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@ibraheem4/linear-mcp"],
      "env": {
        "LINEAR_API_KEY": "your-api-key-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
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

### search_issues
Search for issues using a text query.
```typescript
{
  query: string;       // Required: Search query text
  first?: number;      // Optional: Number of results to return (default: 50)
}
```

### get_issue
Get detailed information about a specific issue.
```typescript
{
  issueId: string;     // Required: Issue ID
}
```

## Development

For local development:

1. Clone the repository:
```bash
git clone https://github.com/ibraheem4/linear-mcp
cd linear-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Copy .env.example and configure your Linear API key:
```bash
cp .env.example .env
```

4. Start development with auto-rebuild:
```bash
npm run watch
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. The project includes the MCP Inspector for debugging:

```bash
npm run inspector
```

This will provide a URL to access debugging tools in your browser.

## Error Handling

The server includes comprehensive error handling for:
- Invalid API keys
- Missing required parameters
- Linear API errors
- Invalid tool requests

All errors are properly formatted and returned with descriptive messages to help diagnose issues.

## Technical Details

Built with:
- TypeScript
- Linear SDK (@linear/sdk v37.0.0)
- MCP SDK (@modelcontextprotocol/sdk v0.6.0)
- dotenv for environment variable management

The server uses stdio for communication and implements the Model Context Protocol for seamless integration with AI agents.

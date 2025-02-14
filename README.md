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
- A GitHub account with a personal access token (PAT)
  - Required scopes: `repo` (full control of private repositories)
  - Generate token at: https://github.com/settings/tokens

## Installation & Configuration

1. Copy .env.example to .env and add your Linear API key:
```bash
cp .env.example .env
```

Then edit .env to add your Linear API key:
```
LINEAR_API_KEY=your-api-key-here
GITHUB_TOKEN=your-github-pat-here
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
        "LINEAR_API_KEY": "your-api-key-here",
        "GITHUB_TOKEN": "your-github-pat-here"
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
        "LINEAR_API_KEY": "your-api-key-here",
        "GITHUB_TOKEN": "your-github-pat-here"
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
        "LINEAR_API_KEY": "your-api-key-here",
        "GITHUB_TOKEN": "your-github-pat-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Image Analysis

This MCP server includes built-in image analysis capabilities that work across both Linear and GitHub integrations. The system automatically detects, extracts, and analyzes images in issue descriptions, PR descriptions, and attachments.

### Features

- **Automatic Image Detection**: Detects images in markdown content using standard markdown image syntax (`![alt](url)`)
- **Cross-Platform Analysis**: Analyzes images in both Linear issues and GitHub PRs
- **Attachment Support**: Handles image attachments in supported formats (jpg, jpeg, png, gif, webp)
- **Extensible Analysis**: Ready for integration with sophisticated image analysis services

### Supported Contexts

- **Linear Issues**
  - Embedded images in issue descriptions
  - Image attachments
  - Images in comments

- **GitHub Pull Requests**
  - Images in PR descriptions
  - Images in PR updates
  - Images carried over from Linear issues when creating feature PRs

### Analysis Output

For each detected image, the system provides:
```typescript
{
  url: string;      // URL of the image
  analysis: string; // Description of the image content
}
```

For attachments, additional metadata is included:
```typescript
{
  id: string;           // Attachment ID
  title: string;        // Attachment title
  url: string;          // Image URL
  source: string;       // Source information
  metadata: any;        // Additional metadata
  analysis: string;     // Image content analysis
}
```

### Integration Points

The image analysis functionality is integrated into several tools:

#### Linear Tools
- `get_issue`: Returns analyzed embedded images and attachments
- `create_issue`: Analyzes any images in the issue description
- `update_issue`: Analyzes images in updated descriptions

#### GitHub Tools
- `github_create_pr`: Analyzes images in PR descriptions
- `github_update_pr`: Analyzes images in updated PR descriptions
- `github_get_pr`: Analyzes images in existing PRs
- `create_feature_pr`: Analyzes images when converting Linear issues to PRs

## GitHub Integration

This MCP server integrates with GitHub to provide seamless workflow between Linear and GitHub repositories. The integration enables:

- **Branch Management**: Create feature branches automatically from Linear issues
- **Pull Request Automation**: Create and update pull requests linked to Linear issues
- **Issue Linking**: Automatically link GitHub PRs to Linear issues for better traceability

### GitHub Tools

#### github_create_branch
Creates a new branch in a GitHub repository.
```typescript
{
  owner: string;        // Required: Repository owner
  repo: string;         // Required: Repository name
  branch: string;       // Required: New branch name
  fromBranch?: string;  // Optional: Base branch to create from (default: dev)
}
```

#### github_create_pr
Creates a pull request in a GitHub repository.
```typescript
{
  owner: string;       // Required: Repository owner
  repo: string;        // Required: Repository name
  title: string;       // Required: Pull request title
  body: string;        // Required: Pull request description
  head: string;        // Required: Head branch
  base: string;        // Optional: Base branch (default: dev)
}
```

#### github_update_pr
Updates an existing pull request.
```typescript
{
  owner: string;         // Required: Repository owner
  repo: string;         // Required: Repository name
  pullNumber: number;   // Required: Pull request number
  title?: string;       // Optional: New pull request title
  body?: string;        // Optional: New pull request description
}
```

#### github_get_pr
Gets details of a GitHub pull request.
```typescript
{
  owner: string;        // Required: Repository owner
  repo: string;        // Required: Repository name
  pullNumber: number;  // Required: Pull request number
}
```

#### github_link_pr_to_linear
Links a GitHub pull request to a Linear issue.
```typescript
{
  owner: string;        // Required: Repository owner
  repo: string;        // Required: Repository name
  pullNumber: number;  // Required: Pull request number
  issueId: string;     // Required: Linear issue ID
}
```

## Linear Tools

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

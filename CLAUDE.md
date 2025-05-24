# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Linear MCP (Model Context Protocol) server that provides AI agents with tools to interact with Linear's API. The server implements Linear's issue, team, and project management functionality through standardized MCP tools.

## Key Commands

Development:
- `npm run build` - Compile TypeScript to /build directory  
- `npm run watch` - Development mode with auto-rebuild on file changes
- `npm run inspector` - Launch MCP inspector at localhost:1337 for testing tools locally
- `./run.sh` - Quick development server using supergateway (requires LINEAR_API_KEY env var)

Publishing:
- `npm run publish:patch|minor|major` - Version bump and publish to npm as @ibraheem4/linear-mcp

## Architecture

### Core Structure
- `src/index.ts` - Single-file MCP server implementation with all tools and Linear SDK integration
- Uses Linear SDK (@linear/sdk v37.0.0) for API communication
- MCP SDK (v0.6.0) handles protocol implementation and stdio transport
- Environment-based configuration via LINEAR_API_KEY

### MCP Tools Implemented
- **create_issue** - Create issues with team, assignee, priority, labels, status
- **list_issues** - List/filter issues by team, assignee, status with pagination
- **update_issue** - Update existing issue properties
- **list_teams** - Get all workspace teams
- **list_projects** - List projects with optional team filtering
- **search_issues** - Text-based issue search
- **get_issue** - Detailed issue information including comments, attachments, relationships

### Technical Implementation
- ES modules with TypeScript targeting ES2022
- Stdio transport for MCP communication (no HTTP server needed)
- Comprehensive error handling with descriptive Linear API error messages
- Async/await pattern for Linear SDK calls with proper Promise handling
- JSON serialization for all tool responses

### Authentication
- Requires LINEAR_API_KEY environment variable
- API key validation on startup with helpful error messages
- Direct Linear SDK authentication (no OAuth flow needed)

## Development Workflow

1. Set LINEAR_API_KEY environment variable
2. Use `npm run watch` for development with auto-rebuild
3. Test tools with `npm run inspector` or `./run.sh` 
4. Build releases with `npm run build` before publishing
5. MCP Inspector provides web interface for testing individual tools

## Configuration Notes

The server is designed to be used as a binary package via npx or configured in MCP client settings files. The build output includes executable permissions for direct CLI usage.
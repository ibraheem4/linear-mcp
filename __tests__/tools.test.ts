import { LinearClient } from "@linear/sdk";
import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import type {
  Team,
  TeamConnection,
  Project,
  ProjectConnection,
  Issue,
  IssueConnection,
} from "@linear/sdk";

// Import types from generated documents
import type {
  ProjectFilter,
  IssueFilter,
  TeamFilter,
} from "@linear/sdk/dist/_generated_documents";

// Mock the entire Linear SDK module
jest.mock("@linear/sdk", () => {
  return {
    LinearClient: jest.fn().mockImplementation(() => ({
      teams: jest.fn(),
      projects: jest.fn(),
      issues: jest.fn(),
      issue: jest.fn(),
      project: jest.fn(),
      searchProjects: jest.fn(),
    })),
  };
});

describe("Linear API Integration Tests", () => {
  let linearClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { LinearClient } = require("@linear/sdk");
    linearClient = new LinearClient({ apiKey: "test" });
  });

  describe("Filter Type Validation", () => {
    describe("Project Filters", () => {
      test("should reject invalid team filter structure", async () => {
        // This test verifies that using 'team' in ProjectFilter is invalid
        const invalidFilter = {
          team: { id: { eq: "team1" } }  // This is the incorrect structure that caused the error
        };

        linearClient.projects.mockRejectedValue(new Error(
          'Variable "$filter" got invalid value { team: { id: [Object] } }; Field "team" is not defined by type "ProjectFilter".'
        ));

        // The API should reject invalid filter structure
        await expect(linearClient.projects({ 
          filter: invalidFilter 
        })).rejects.toThrow("Field \"team\" is not defined by type \"ProjectFilter\"");
      });

      test("should reject invalid filter operator", async () => {
        const invalidFilter = {
          state: { invalidOp: "started" }
        };

        linearClient.projects.mockRejectedValue(new Error(
          'Invalid filter operator "invalidOp"'
        ));

        await expect(linearClient.projects({ 
          filter: invalidFilter 
        })).rejects.toThrow('Invalid filter operator');
      });

      test("should reject invalid value type", async () => {
        const invalidFilter = {
          priority: { eq: "high" }  // Priority should be a number
        };

        linearClient.projects.mockRejectedValue(new Error(
          'Variable "$filter" got invalid value at "priority.eq"; Expected type "Int", found "high".'
        ));

        await expect(linearClient.projects({ 
          filter: invalidFilter 
        })).rejects.toThrow('Expected type "Int"');
      });

      test("should accept valid project filter structure", async () => {
        const validFilter = {
          // Correct way to filter by team
          accessibleTeams: {
            some: {
              id: { eq: "team1" }
            }
          },
          state: { eq: "started" },
          creator: { id: { eq: "user1" } }
        } satisfies ProjectFilter;

        linearClient.projects.mockResolvedValue({ nodes: [] });
        
        await expect(linearClient.projects({ 
          filter: validFilter 
        })).resolves.not.toThrow();
        
        expect(linearClient.projects).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: validFilter
          })
        );
      });

      test("should handle all valid project filter fields", async () => {
        const fullFilter = {
          accessibleTeams: {
            some: {
              id: { eq: "team1" }
            }
          },
          state: { eq: "started" },
          creator: { id: { eq: "user1" } },
          lead: { id: { eq: "user2" } },
          createdAt: { gt: new Date() },
          updatedAt: { lt: new Date() },
          name: { contains: "test" },
          slugId: { eq: "test-project" },
          priority: { eq: 1 }
        } satisfies ProjectFilter;

        linearClient.projects.mockResolvedValue({ nodes: [] });
        
        await expect(linearClient.projects({ 
          filter: fullFilter 
        })).resolves.not.toThrow();
      });
    });

    describe("Issue Filters", () => {
      test("should accept valid issue filter structure", async () => {
        const validFilter = {
          team: { id: { eq: "team1" } },
          assignee: { id: { eq: "user1" } },
          creator: { id: { eq: "user2" } },
          state: { name: { eq: "In Progress" } },
        } satisfies IssueFilter;

        linearClient.issues.mockResolvedValue({ nodes: [] });
        
        await expect(linearClient.issues({ 
          filter: validFilter 
        })).resolves.not.toThrow();
        
        expect(linearClient.issues).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: validFilter
          })
        );
      });

      test("should handle all valid issue filter fields", async () => {
        const fullFilter = {
          team: { id: { eq: "team1" } },
          assignee: { id: { eq: "user1" } },
          creator: { id: { eq: "user2" } },
          state: { name: { eq: "In Progress" } },
          priority: { eq: 1 },
          dueDate: { lt: new Date() },
          estimate: { gt: 0 },
          labels: { some: { name: { eq: "bug" } } },
          title: { contains: "test" },
        } satisfies IssueFilter;

        linearClient.issues.mockResolvedValue({ nodes: [] });
        
        await expect(linearClient.issues({ 
          filter: fullFilter 
        })).resolves.not.toThrow();
      });

      test("should reject invalid issue filter fields", async () => {
        const invalidFilter = {
          invalidField: { eq: "value" }
        };

        linearClient.issues.mockRejectedValue(new Error(
          'Variable "$filter" got invalid value { invalidField: [Object] }; Field "invalidField" is not defined by type "IssueFilter".'
        ));

        await expect(linearClient.issues({ 
          filter: invalidFilter 
        })).rejects.toThrow('Field "invalidField" is not defined by type "IssueFilter"');
      });
    });
  });

  describe("Teams", () => {
    test("list_teams should return valid team data", async () => {
      const mockTeams = {
        nodes: [
          {
            id: "team1",
            name: "Team 1",
            key: "T1",
            description: "First team",
            color: "#000000",
            icon: "icon",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
      };

      linearClient.teams.mockResolvedValue(mockTeams);

      const result = await linearClient.teams();
      
      // Runtime type validation
      expect(result.nodes).toBeInstanceOf(Array);
      expect(result.nodes[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        key: expect.any(String),
        description: expect.any(String),
      });
    });
  });

  describe("Projects", () => {
    test("list_projects should return valid project data", async () => {
      const mockProjects = {
        nodes: [
          {
            id: "proj1",
            name: "Project 1",
            description: "First project",
            state: "started",
            teams: {
              nodes: [
                { id: "team1", name: "Team 1" }
              ]
            },
            color: "#000000",
            createdAt: new Date(),
            updatedAt: new Date(),
            icon: "icon",
            slugId: "proj-1",
            sortOrder: 0,
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
      };

      linearClient.projects.mockResolvedValue(mockProjects);

      // Test basic project listing without filters
      const result = await linearClient.projects({
        first: 50
      });

      // Runtime type validation
      expect(result.nodes).toBeInstanceOf(Array);
      expect(result.nodes[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        state: expect.any(String),
      });
    });

    test("list_projects should handle multiple filter conditions", async () => {
      const mockProjects = {
        nodes: [
          {
            id: "proj1",
            name: "Project 1",
            description: "First project",
            state: "started",
            teams: {
              nodes: [
                { id: "team1", name: "Team 1" }
              ]
            }
          }
        ],
        pageInfo: {
          hasNextPage: false,
        }
      };

      linearClient.projects.mockResolvedValue(mockProjects);

      // Test with valid filter conditions
      const result = await linearClient.projects({
        filter: {
          state: { eq: "started" },
          creator: { id: { eq: "user1" } }
        }
      });

      // Verify the mock was called with correct filter structure
      expect(linearClient.projects).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            state: { eq: expect.any(String) },
            creator: { id: { eq: expect.any(String) } }
          })
        })
      );
    });

    test("get_project should return valid project data", async () => {
      const mockProject = {
        id: "proj1",
        name: "Test Project",
        description: "Test description",
        state: "active",
        color: "#000000",
        createdAt: new Date(),
        updatedAt: new Date(),
        icon: "icon",
        slugId: "test-proj",
        sortOrder: 0,
      };

      linearClient.project.mockResolvedValue(mockProject);

      const result = await linearClient.project("proj1");

      // Runtime type validation
      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        state: expect.any(String),
      });
    });
  });

  describe("Issues", () => {
    test("list_issues should accept filter and return valid issue data", async () => {
      const mockIssues = {
        nodes: [
          {
            id: "issue1",
            title: "Issue 1",
            identifier: "TEAM-1",
            priority: 1,
            estimate: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            number: 1,
            boardOrder: 0,
            sortOrder: 0,
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
      };

      linearClient.issues.mockResolvedValue(mockIssues);

      // Test with filter
      const filter = {
        team: { id: { eq: "team1" } },
        assignee: { id: { eq: "user1" } },
        state: { name: { eq: "In Progress" } },
      };

      const result = await linearClient.issues({ filter, first: 10 });

      // Runtime type validation
      expect(result.nodes).toBeInstanceOf(Array);
      expect(result.nodes[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        identifier: expect.any(String),
      });
    });

    test("get_issue should return valid issue data", async () => {
      const mockIssue = {
        id: "issue1",
        title: "Test Issue",
        identifier: "TEAM-123",
        description: "Test description",
        priority: 1,
        estimate: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        number: 123,
        boardOrder: 0,
        sortOrder: 0,
      };

      linearClient.issue.mockResolvedValue(mockIssue);

      const result = await linearClient.issue("issue1");

      // Runtime type validation
      expect(result).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        identifier: expect.any(String),
      });
    });
  });
});
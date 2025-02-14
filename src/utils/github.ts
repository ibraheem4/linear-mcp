import { Octokit } from "@octokit/rest";
import {
  BranchDiff,
  CreatePRParams,
  DiffAnalysis,
  FileChange,
  FormattedPRBody,
  PullRequestChange,
} from "../types/github.js";

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async createBranch(params: {
    owner: string;
    repo: string;
    branch: string;
    fromBranch?: string;
  }): Promise<void> {
    // Get the SHA of the source branch
    const { data: ref } = await this.octokit.git.getRef({
      owner: params.owner,
      repo: params.repo,
      ref: `heads/${params.fromBranch || "dev"}`,
    });

    // Create new branch
    await this.octokit.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${params.branch}`,
      sha: ref.object.sha,
    });
  }

  async getExistingPR(params: {
    owner: string;
    repo: string;
    head: string;
    base: string;
  }) {
    const { data: prs } = await this.octokit.pulls.list({
      owner: params.owner,
      repo: params.repo,
      state: "open",
      head: `${params.owner}:${params.head}`,
      base: params.base,
    });
    return prs[0];
  }

  async updatePullRequest(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    title?: string;
    body?: string;
  }) {
    const { data: pr } = await this.octokit.pulls.update({
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
      title: params.title,
      body: params.body,
    });
    return pr;
  }

  private async getPRTemplate(
    owner: string,
    repo: string
  ): Promise<string | null> {
    try {
      // Try to get the pull request template from different common locations
      const templatePaths = [
        ".github/pull_request_template.md",
        ".github/PULL_REQUEST_TEMPLATE.md",
        "docs/pull_request_template.md",
        "PULL_REQUEST_TEMPLATE.md",
      ];

      for (const path of templatePaths) {
        try {
          const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path,
          });

          if ("content" in data) {
            return Buffer.from(data.content, "base64").toString();
          }
        } catch (error) {
          continue; // Try next path if this one fails
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching PR template:", error);
      return null;
    }
  }

  private formatLinearIssueForPR(
    issue: CreatePRParams["linearIssue"]
  ): FormattedPRBody {
    if (!issue) {
      throw new Error("Linear issue is required");
    }

    const formatted: FormattedPRBody = {
      overview: issue.description || "",
      keyChanges: [],
      codeHighlights: [],
      testing: [],
      links: [`[Linear Issue ${issue.id}](${issue.url})`],
      attachments: [],
    };

    // Extract key changes from description using bullet points
    const bulletPoints = issue.description?.match(/[-*]\s+([^\n]+)/g) || [];
    formatted.keyChanges = bulletPoints.map((point: string) => point.trim());

    // Add any attachments/images from Linear
    if (issue.attachments?.length) {
      formatted.attachments = issue.attachments.map(
        (img) =>
          `<img width="758" alt="${img.title || "Screenshot"}" src="${
            img.url
          }">`
      );
    }

    return formatted;
  }

  private fillPRTemplate(template: string, formatted: FormattedPRBody): string {
    let filledTemplate = template;

    // Fill Overview section
    filledTemplate = filledTemplate.replace(
      /## Overview.*?(?=## |$)/s,
      `## Overview\n\n${formatted.overview}\n\n`
    );

    // Fill Key Changes section
    const keyChangesContent = formatted.keyChanges.length
      ? formatted.keyChanges.map((change) => `- ${change}`).join("\n")
      : "- Initial implementation";
    filledTemplate = filledTemplate.replace(
      /## Key Changes.*?(?=## |$)/s,
      `## Key Changes\n\n${keyChangesContent}\n\n`
    );

    // Fill Testing section
    const testingContent = formatted.testing.length
      ? formatted.testing.join("\n")
      : "- [ ] Tested locally\n- [ ] Unit tests added/updated\n- [ ] Integration tests added/updated";
    filledTemplate = filledTemplate.replace(
      /## Testing.*?(?=## |$)/s,
      `## Testing\n\n${testingContent}\n\n`
    );

    // Fill Links section
    const linksContent = formatted.links.join("\n");
    filledTemplate = filledTemplate.replace(
      /## Links.*?(?=## |$)/s,
      `## Links\n\n${linksContent}\n\n`
    );

    // Fill Attachments section
    if (formatted.attachments.length) {
      const attachmentsContent = formatted.attachments.join("\n");
      filledTemplate = filledTemplate.replace(
        /## Attachments.*?(?=## |$)/s,
        `## Attachments\n\n${attachmentsContent}\n\n`
      );
    }

    return filledTemplate;
  }

  async createPullRequest(params: CreatePRParams) {
    let body = params.body;

    // If we have a Linear issue and no specific body provided, try to use PR template
    if (params.linearIssue && !params.body) {
      const template = await this.getPRTemplate(params.owner, params.repo);
      if (template) {
        const formatted = this.formatLinearIssueForPR(params.linearIssue);
        body = this.fillPRTemplate(template, formatted);
      }
    }

    const { data: pr } = await this.octokit.pulls.create({
      ...params,
      body,
      maintainer_can_modify: true,
    });

    return pr;
  }

  async getPullRequest(params: {
    owner: string;
    repo: string;
    pullNumber: number;
  }) {
    const { data: pr } = await this.octokit.pulls.get({
      owner: params.owner,
      repo: params.repo,
      pull_number: params.pullNumber,
    });

    // Get PR body to check for referenced issues
    const bodyMatches = pr.body?.match(/\b([A-Z]+-\d+)\b/g) || [];
    const titleMatches = pr.title.match(/\b([A-Z]+-\d+)\b/g) || [];

    // Combine and deduplicate Linear issues
    const linearIssues = [...new Set([...titleMatches, ...bodyMatches])];

    return {
      ...pr,
      linearIssues,
    };
  }

  async getMergedPRs(params: {
    owner: string;
    repo: string;
    base: string;
    head: string;
  }): Promise<PullRequestChange[]> {
    // Get comparison between base and head
    const { data: comparison } = await this.octokit.repos.compareCommits({
      owner: params.owner,
      repo: params.repo,
      base: params.base,
      head: params.head,
    });

    // Get all PRs merged between these commits
    const { data: prs } = await this.octokit.pulls.list({
      owner: params.owner,
      repo: params.repo,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });

    // Filter PRs that were merged between the comparison range
    const mergedPRs = prs.filter((pr) => {
      return (
        pr.merged_at &&
        pr.merge_commit_sha &&
        comparison.commits.some((commit) => commit.sha === pr.merge_commit_sha)
      );
    });

    // Get detailed information for each PR
    const prDetails = await Promise.all(
      mergedPRs.map(async (pr) => {
        const details = await this.getPullRequest({
          owner: params.owner,
          repo: params.repo,
          pullNumber: pr.number,
        });

        return {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          mergedAt: pr.merged_at!,
          author: pr.user?.login || "unknown",
          body: pr.body || "",
          linearIssues: details.linearIssues,
        };
      })
    );

    return prDetails;
  }

  async analyzeChanges(params: {
    owner: string;
    repo: string;
    base: string;
    head: string;
  }): Promise<{
    files: FileChange[];
    prs: PullRequestChange[];
  }> {
    const [{ data: comparison }, prs] = await Promise.all([
      this.octokit.repos.compareCommits({
        owner: params.owner,
        repo: params.repo,
        base: params.base,
        head: params.head,
      }),
      this.getMergedPRs(params),
    ]);

    const files =
      comparison.files?.map((file) => ({
        filePath: file.filename,
        additions: file.additions,
        deletions: file.deletions,
      })) || [];

    return {
      files,
      prs,
    };
  }

  async getBranchDiff(params: {
    owner: string;
    repo: string;
    base: string;
    head: string;
  }): Promise<BranchDiff> {
    const { files } = await this.analyzeChanges(params);

    const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
    const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

    // Group files by directory for better analysis
    const filesByDir = files.reduce((acc, file) => {
      const dir = file.filePath.split("/")[0];
      if (!acc[dir]) acc[dir] = [];
      acc[dir].push(file);
      return acc;
    }, {} as Record<string, FileChange[]>);

    // Generate summary based on changes
    const dirChanges = Object.entries(filesByDir).map(([dir, files]) => {
      const adds = files.reduce((sum, f) => sum + f.additions, 0);
      const dels = files.reduce((sum, f) => sum + f.deletions, 0);
      return `${dir} (${files.length} files, +${adds} -${dels})`;
    });

    const analysis: DiffAnalysis = {
      changedFiles: files,
      totalAdditions,
      totalDeletions,
      summary: `Changed ${files.length} files across ${
        Object.keys(filesByDir).length
      } directories: ${dirChanges.join(", ")}`,
    };

    return {
      files,
      analysis,
    };
  }

  generatePRTitle(params: {
    diff: BranchDiff;
    prs: PullRequestChange[];
  }): string {
    // Analyze PR types (feat, fix, etc.)
    const prTypes = params.prs.reduce((acc: Record<string, number>, pr) => {
      const type = pr.title
        .split(":")[0]
        .replace(/^\[.*\]\s*/, "")
        .trim();
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const mainTypes = Object.entries(prTypes)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([type]) => type);

    // Get main components changed
    const { analysis } = params.diff;
    const mainDirs = Object.entries(
      analysis.changedFiles.reduce(
        (acc: Record<string, number>, file: FileChange) => {
          const dir = file.filePath.split("/")[0];
          if (!acc[dir]) acc[dir] = 0;
          acc[dir]++;
          return acc;
        },
        {} as Record<string, number>
      )
    )
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 2)
      .map(([dir]) => dir);

    // Generate descriptive title based on PR content
    const typeStr = mainTypes.length > 0 ? mainTypes.join("/") : "chore";

    // Extract key changes from PR titles
    const prSummaries = params.prs.map((pr) => {
      const [, ...summary] = pr.title.split(":").map((s) => s.trim());
      return summary
        .join(":")
        .replace(/^\[.*\]\s*/, "")
        .replace(/:+$/, "");
    });

    // Use the most significant PR summary or fallback to components
    const summary =
      prSummaries.length > 0
        ? prSummaries[0]
        : `update ${mainDirs.join(" and ")} components`;

    return `release: ${typeStr} ${summary}`;
  }

  async linkPullRequestToLinear(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    issueId: string;
  }) {
    const pr = await this.getPullRequest({
      owner: params.owner,
      repo: params.repo,
      pullNumber: params.pullNumber,
    });

    // Add Linear issue reference if not already present
    if (!pr.body?.includes(params.issueId)) {
      const updatedBody = `${pr.body || ""}\n\nFixes ${params.issueId}`;
      await this.updatePullRequest({
        owner: params.owner,
        repo: params.repo,
        pullNumber: params.pullNumber,
        body: updatedBody,
      });
    }

    return pr;
  }
}

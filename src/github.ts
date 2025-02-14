import { Octokit } from "@octokit/rest";

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
  }) {
    const { owner, repo, branch, fromBranch = "dev" } = params;

    // Get the SHA of the base branch
    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    // Create new branch from the base branch SHA
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: ref.object.sha,
    });

    return { success: true };
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
    return {
      number: pr.number,
      url: pr.html_url,
    };
  }

  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }) {
    const { data: pr } = await this.octokit.pulls.create(params);
    return {
      number: pr.number,
      url: pr.html_url,
    };
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

    return {
      title: pr.title,
      body: pr.body || "",
      number: pr.number,
      url: pr.html_url,
      head: pr.head.ref,
      base: pr.base.ref,
    };
  }

  async linkPullRequestToLinear(params: {
    owner: string;
    repo: string;
    pullNumber: number;
    issueId: string;
  }) {
    const { owner, repo, pullNumber, issueId } = params;

    // Add Linear issue reference to PR description
    const { data: pr } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const updatedBody = `Fixes ${issueId}\n\n${pr.body || ""}`;

    await this.octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      body: updatedBody,
    });

    return { success: true };
  }
}

export interface PRTemplateSection {
  name: string;
  content: string;
}

export interface FormattedPRBody {
  overview: string;
  keyChanges: string[];
  codeHighlights: string[];
  testing: string[];
  links: string[];
  attachments: string[];
}

export interface FileChange {
  filePath: string;
  additions: number;
  deletions: number;
}

export interface DiffAnalysis {
  changedFiles: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  summary: string;
}

export interface BranchDiff {
  files: FileChange[];
  analysis: DiffAnalysis;
}

export interface PullRequestChange {
  number: number;
  title: string;
  url: string;
  mergedAt: string;
  author: string;
  body: string;
  linearIssues: string[];
}

export interface CreatePRParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  linearIssue?: {
    id: string;
    title: string;
    description: string;
    url: string;
    attachments?: Array<{
      id: string;
      url: string;
      title?: string;
    }>;
  };
}
